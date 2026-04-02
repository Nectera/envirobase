import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireOrg } from "@/lib/org-context";
import prisma from "@/lib/prisma";
import {
  COMPANY_NAME,
  COMPANY_SHORT,
  COMPANY_LOCATION,
  BRAND_COLOR,
  APP_DOMAIN,
  LOGO_URL,
} from "@/lib/branding";
import { LABOR_RATES } from "@/lib/materials";
import { readFile } from "fs/promises";
import path from "path";

export const maxDuration = 30;

/** Parse hex color string to rgb() */
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/** Darken a hex color by a factor (0-1, where 0 = black) */
function darkenHex(hex: string, factor: number) {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.substring(0, 2), 16) * factor) / 255;
  const g = Math.round(parseInt(h.substring(2, 4), 16) * factor) / 255;
  const b = Math.round(parseInt(h.substring(4, 6), 16) * factor) / 255;
  return rgb(r, g, b);
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const est = await prisma.consultationEstimate.findFirst({
    where: { id: params.id, organizationId: orgId },
  });
  if (!est) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const d: any = est;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 50;
  const COL_W = PAGE_W - MARGIN * 2;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const black = rgb(0, 0, 0);
  const darkGray = rgb(0.3, 0.3, 0.3);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.92, 0.92, 0.92);
  const veryLightGray = rgb(0.96, 0.96, 0.96);
  const white = rgb(1, 1, 1);
  const brand = hexToRgb(BRAND_COLOR);
  const brandDark = darkenHex(BRAND_COLOR, 0.7);

  const checkPage = (needed: number) => {
    if (y - needed < MARGIN + 20) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const sanitize = (val: any): string => {
    if (val == null) return "";
    const str =
      typeof val === "string"
        ? val
        : typeof val === "object"
          ? JSON.stringify(val)
          : String(val);
    return str
      .replace(/[\n\r\t]/g, " ")
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
  };

  const drawText = (
    text: any,
    x: number,
    yPos: number,
    size: number,
    f = font,
    color = black,
  ) => {
    page.drawText(sanitize(text), { x, y: yPos, size, font: f, color });
  };

  const wrapText = (
    text: string,
    maxWidth: number,
    size: number,
  ): string[] => {
    if (!text) return ["N/A"];
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : ["N/A"];
  };

  // Section header with green left-accent bar
  const sectionHeader = (title: string) => {
    checkPage(30);
    y -= 14;
    // Green accent bar on left
    page.drawRectangle({
      x: MARGIN,
      y: y - 2,
      width: 3,
      height: 14,
      color: brand,
    });
    drawText(title, MARGIN + 10, y, 11, fontBold, brandDark);
    y -= 8;
  };

  const fieldRow = (label: string, value: any, labelWidth = 140) => {
    checkPage(16);
    y -= 14;
    drawText(label, MARGIN + 10, y, 8, fontBold, gray);
    drawText(value || "N/A", MARGIN + labelWidth, y, 9, font, black);
  };

  const fieldRowDouble = (l1: string, v1: any, l2: string, v2: any) => {
    checkPage(16);
    y -= 14;
    drawText(l1, MARGIN + 10, y, 8, fontBold, gray);
    drawText(v1 || "N/A", MARGIN + 120, y, 9);
    const midX = PAGE_W / 2 + 20;
    drawText(l2, midX, y, 8, fontBold, gray);
    drawText(v2 || "N/A", midX + 110, y, 9);
  };

  const longField = (label: string, value: any) => {
    const text =
      typeof value === "string" ? value : value != null ? String(value) : "";
    const rawLines = text ? text.split("\n") : ["N/A"];
    const allLines: string[] = [];
    for (const raw of rawLines) {
      allLines.push(...wrapText(raw || " ", COL_W - 20, 9));
    }
    checkPage(14 + allLines.length * 13);
    y -= 14;
    if (label) drawText(label, MARGIN + 10, y, 8, fontBold, gray);
    for (const line of allLines) {
      y -= 13;
      drawText(line, MARGIN + 10, y, 9);
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(v);

  // === WHITE HEADER WITH LOGO ===
  // Try to embed the logo
  let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  try {
    const logoPath = path.join(
      process.cwd(),
      "public",
      LOGO_URL.replace(/^\//, ""),
    );
    const logoBytes = await readFile(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch {
    // Logo not found or not a valid PNG — skip silently
  }

  if (logoImage) {
    const logoH = 36;
    const logoW = logoH * (logoImage.width / logoImage.height);
    page.drawImage(logoImage, {
      x: MARGIN,
      y: y - logoH + 10,
      width: logoW,
      height: logoH,
    });
    drawText(COMPANY_NAME, MARGIN + logoW + 12, y - 8, 14, fontBold, brandDark);
    drawText(COMPANY_LOCATION, MARGIN + logoW + 12, y - 22, 9, font, gray);
    y -= logoH + 6;
  } else {
    drawText(COMPANY_NAME, MARGIN, y, 14, fontBold, brandDark);
    y -= 14;
    drawText(COMPANY_LOCATION, MARGIN, y, 9, font, gray);
    y -= 16;
  }

  // Green accent bar under header
  y -= 4;
  page.drawRectangle({
    x: MARGIN,
    y,
    width: COL_W,
    height: 3,
    color: brand,
  });
  y -= 16;

  // "Consultation Estimate" title
  drawText("Consultation Estimate", MARGIN, y, 18, fontBold, brandDark);
  y -= 4;

  // === CLIENT INFO CARD ===
  sectionHeader("Client Information");

  // Light background card
  const cardTop = y;
  const cardPadding = 8;
  // Draw card after we know the height — for now gather fields
  const customerName = sanitize(d.customerName);
  const addressLine = `${d.address || ""}, ${d.city || ""}, ${d.state || "CO"} ${d.zip || ""}`;
  const dateLine = d.projectDate
    ? new Date(d.projectDate).toLocaleDateString("en-US")
    : "N/A";

  // Card background
  checkPage(70);
  page.drawRectangle({
    x: MARGIN,
    y: y - 58,
    width: COL_W,
    height: 60,
    color: veryLightGray,
  });
  // Card left accent
  page.drawRectangle({
    x: MARGIN,
    y: y - 58,
    width: 3,
    height: 60,
    color: brand,
  });

  y -= 4;
  fieldRow("Customer:", customerName, 120);
  fieldRow("Address:", addressLine, 120);
  fieldRowDouble("Date:", dateLine, "Payment Type:", d.paymentType || "N/A");
  if (d.lossType) fieldRow("Type of Loss:", d.lossType, 120);
  y -= 4;

  // === SCOPE OF WORK ===
  if (d.scopeOfWork || d.serviceDescription) {
    sectionHeader("Scope of Work");
    if (d.serviceDescription) longField("Service:", d.serviceDescription);
    if (d.scopeOfWork) longField("", d.scopeOfWork);
  }

  // === PROJECT DETAILS ===
  sectionHeader("Project Details");
  fieldRowDouble(
    "Estimated Duration:",
    `${d.daysNeeded || 0} days`,
    "Crew Size:",
    String(d.crewSize || 0),
  );
  if (d.permitNeeded && d.permitNeeded !== "No")
    fieldRow("Permit:", d.permitNeeded, 120);
  if (d.vacateProperty && d.vacateProperty !== "No")
    fieldRow("Vacate Property:", d.vacateProperty, 120);
  if (d.airClearances) fieldRow("Air Clearances:", d.airClearances, 120);
  if (d.dumpsterPlacement)
    fieldRow("Dumpster Placement:", d.dumpsterPlacement, 140);

  // === COST SUMMARY ===
  sectionHeader("Cost Summary");

  // Calculate totals
  const supReg = d.supervisorHours || 0;
  const supOt = d.supervisorOtHours || 0;
  const techReg = d.technicianHours || 0;
  const techOt = d.technicianOtHours || 0;
  const supRate =
    LABOR_RATES.supervisor.hourly + LABOR_RATES.supervisor.taxBurden;
  const supOtRate =
    LABOR_RATES.supervisor.hourly * 1.5 + LABOR_RATES.supervisor.taxBurden;
  const techRate =
    LABOR_RATES.technician.hourly + LABOR_RATES.technician.taxBurden;
  const techOtRate =
    LABOR_RATES.technician.hourly * 1.5 + LABOR_RATES.technician.taxBurden;
  const laborTotal =
    d.laborCost ??
    supReg * supRate +
      supOt * supOtRate +
      techReg * techRate +
      techOt * techOtRate;
  const totalHours = supReg + supOt + techReg + techOt;
  const opsCost = d.opsCost ?? totalHours * (d.opsPerHourRate || 0);
  const cogsArr: Array<{ item: string; qty: number; cost: number }> =
    Array.isArray(d.cogs) ? d.cogs : [];
  const cogsTotal =
    d.cogsCost ?? cogsArr.reduce((s: number, i: any) => s + (i.cost || 0), 0);
  const matsArr: Array<{
    name: string;
    qty: number;
    unitPrice?: number;
    cost?: number;
  }> = Array.isArray(d.materials) ? d.materials : [];
  const matsTotal =
    d.materialCost ??
    matsArr.reduce(
      (s: number, m: any) =>
        s + (m.cost ?? (m.qty || 0) * (m.unitPrice || 0)),
      0,
    );
  const grandTotal =
    d.totalCost ?? laborTotal + opsCost + cogsTotal + matsTotal;
  const autoMarkup = 15 + (d.difficultyRating || 3);
  const hasOverride =
    d.customerPriceOverride != null && d.customerPriceOverride > 0;
  const customerPrice = hasOverride
    ? d.customerPriceOverride
    : (d.customerPrice ?? grandTotal * (1 + autoMarkup / 100));

  // Build line items: Labor + COGS (excl Vehicle/Trailer, $0) + Materials
  const EXCLUDED_COGS = ["Vehicle", "Trailer"];
  const activeCogsItems = cogsArr.filter(
    (c: any) => c.cost > 0 && !EXCLUDED_COGS.includes(c.item),
  );

  // Collect all visible rows
  const costRows: Array<{ label: string; amount: number }> = [];
  costRows.push({ label: "Labor", amount: laborTotal });
  for (const item of activeCogsItems) {
    costRows.push({ label: item.item, amount: item.cost });
  }
  if (matsTotal > 0) {
    costRows.push({ label: "Materials & Supplies", amount: matsTotal });
  }

  // Table header
  checkPage(20 + costRows.length * 18 + 40);
  y -= 16;
  const tblLeft = MARGIN;
  const tblRight = PAGE_W - MARGIN;
  const costCol = tblRight - 80;

  // Header row background
  page.drawRectangle({
    x: tblLeft,
    y: y - 4,
    width: COL_W,
    height: 16,
    color: lightGray,
  });
  drawText("Description", tblLeft + 8, y, 8, fontBold, darkGray);
  drawText("Amount", costCol, y, 8, fontBold, darkGray);

  // Data rows with alternating shading
  for (let i = 0; i < costRows.length; i++) {
    const row = costRows[i];
    y -= 18;
    checkPage(20);

    // Alternating row background
    if (i % 2 === 1) {
      page.drawRectangle({
        x: tblLeft,
        y: y - 4,
        width: COL_W,
        height: 16,
        color: veryLightGray,
      });
    }

    drawText(row.label, tblLeft + 8, y, 9);
    const amtStr = fmt(row.amount);
    const amtW = font.widthOfTextAtSize(amtStr, 9);
    drawText(amtStr, tblRight - 8 - amtW, y, 9);
  }

  // Separator
  y -= 8;
  page.drawLine({
    start: { x: tblLeft, y },
    end: { x: tblRight, y },
    thickness: 1,
    color: lightGray,
  });

  // ESTIMATE TOTAL — dark branded bar
  y -= 6;
  const totalBarH = 30;
  page.drawRectangle({
    x: tblLeft,
    y: y - totalBarH + 10,
    width: COL_W,
    height: totalBarH,
    color: brandDark,
  });
  drawText("ESTIMATE TOTAL", tblLeft + 10, y - 10, 13, fontBold, white);
  const priceStr = fmt(customerPrice);
  const priceW = fontBold.widthOfTextAtSize(priceStr, 13);
  drawText(priceStr, tblRight - 10 - priceW, y - 10, 13, fontBold, white);
  y -= totalBarH + 6;

  // === TERMS & CONDITIONS ===
  y -= 10;
  sectionHeader("Terms & Conditions");
  const terms = [
    "This estimate is valid for 30 days from the date above.",
    "Payment terms are subject to the payment type noted. Insurance claims will be billed directly to the carrier when applicable.",
    "Any additional work beyond the scope described will require a written change order and may result in additional charges.",
    `All work performed by ${COMPANY_SHORT} will comply with applicable federal, state, and local regulations.`,
    "Customer is responsible for providing access to the work area and ensuring utilities are available unless otherwise noted.",
  ];
  for (const term of terms) {
    const lines = wrapText(term, COL_W - 20, 8);
    checkPage(lines.length * 11 + 6);
    for (const line of lines) {
      y -= 11;
      drawText(line, MARGIN + 10, y, 8, font, gray);
    }
    y -= 4;
  }

  // === ACCEPTANCE ===
  checkPage(110);
  y -= 10;
  sectionHeader("Acceptance");
  y -= 6;
  const acceptLines = wrapText(
    "By signing below, the customer agrees to the scope of work and pricing outlined in this estimate.",
    COL_W - 10,
    9,
  );
  for (const line of acceptLines) {
    y -= 13;
    drawText(line, MARGIN + 10, y, 9);
  }

  y -= 30;
  // Signature line
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + 220, y },
    thickness: 0.5,
    color: black,
  });
  drawText("Customer Signature", MARGIN, y - 12, 8, font, gray);

  // Date line
  page.drawLine({
    start: { x: MARGIN + 280, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.5,
    color: black,
  });
  drawText("Date", MARGIN + 280, y - 12, 8, font, gray);

  y -= 30;
  // Printed name line
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + 220, y },
    thickness: 0.5,
    color: black,
  });
  drawText("Printed Name", MARGIN, y - 12, 8, font, gray);

  // === FOOTER ON EACH PAGE ===
  const pages = pdfDoc.getPages();
  const domainText = APP_DOMAIN;
  pages.forEach((p, i) => {
    // Green footer strip
    p.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: 24,
      color: brand,
    });
    p.drawText(COMPANY_NAME, {
      x: MARGIN,
      y: 8,
      size: 7,
      font: fontBold,
      color: white,
    });
    const domainW = font.widthOfTextAtSize(domainText, 7);
    p.drawText(domainText, {
      x: PAGE_W / 2 - domainW / 2,
      y: 8,
      size: 7,
      font,
      color: white,
    });
    const pageText = `Page ${i + 1} of ${pages.length}`;
    const pageTextW = font.widthOfTextAtSize(pageText, 7);
    p.drawText(pageText, {
      x: PAGE_W - MARGIN - pageTextW,
      y: 8,
      size: 7,
      font,
      color: white,
    });
  });

  const pdfBytes = await pdfDoc.save();
  const custSlug = (d.customerName || "estimate")
    .replace(/\s+/g, "-")
    .slice(0, 30);
  const filename = `Estimate-${custSlug}.pdf`;

  return new NextResponse(new Uint8Array(Buffer.from(pdfBytes)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
