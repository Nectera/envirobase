import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireOrg } from "@/lib/org-context";
import prisma from "@/lib/prisma";
import { COMPANY_NAME, COMPANY_LOCATION } from "@/lib/branding";
import { LABOR_RATES } from "@/lib/materials";

export const maxDuration = 30;

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

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 50;
  const COL_W = PAGE_W - MARGIN * 2;

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.85, 0.85, 0.85);
  const brandGreen = rgb(0.48, 0.76, 0.26);

  const checkPage = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const sanitize = (val: any): string => {
    if (val == null) return "";
    const str = typeof val === "string" ? val : (typeof val === "object" ? JSON.stringify(val) : String(val));
    return str.replace(/[\n\r\t]/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
  };

  const drawText = (text: any, x: number, yPos: number, size: number, f = font, color = black) => {
    page.drawText(sanitize(text), { x, y: yPos, size, font: f, color });
  };

  const wrapText = (text: string, maxWidth: number, size: number): string[] => {
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

  const sectionHeader = (title: string) => {
    checkPage(30);
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: PAGE_W - MARGIN, y: y + 4 }, thickness: 1, color: lightGray });
    y -= 16;
    drawText(title, MARGIN, y, 11, fontBold, brandGreen);
    y -= 6;
  };

  const fieldRow = (label: string, value: any, labelWidth = 160) => {
    checkPage(16);
    y -= 14;
    drawText(label, MARGIN, y, 8, fontBold, gray);
    drawText(value || "N/A", MARGIN + labelWidth, y, 9, font, black);
  };

  const fieldRowDouble = (l1: string, v1: any, l2: string, v2: any) => {
    checkPage(16);
    y -= 14;
    drawText(l1, MARGIN, y, 8, fontBold, gray);
    drawText(v1 || "N/A", MARGIN + 120, y, 9);
    const midX = PAGE_W / 2 + 20;
    drawText(l2, midX, y, 8, fontBold, gray);
    drawText(v2 || "N/A", midX + 120, y, 9);
  };

  const longField = (label: string, value: any) => {
    const text = typeof value === "string" ? value : (value != null ? String(value) : "");
    const rawLines = text ? text.split("\n") : ["N/A"];
    const allLines: string[] = [];
    for (const raw of rawLines) {
      allLines.push(...wrapText(raw || " ", COL_W - 10, 9));
    }
    checkPage(14 + allLines.length * 13);
    y -= 14;
    if (label) drawText(label, MARGIN, y, 8, fontBold, gray);
    for (const line of allLines) {
      y -= 13;
      drawText(line, MARGIN, y, 9);
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  // === HEADER ===
  drawText(COMPANY_NAME, MARGIN, y, 14, fontBold);
  y -= 14;
  drawText(COMPANY_LOCATION, MARGIN, y, 8, font, gray);
  y -= 22;
  drawText("Consultation Estimate", MARGIN, y, 16, fontBold, brandGreen);
  y -= 4;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 2, color: brandGreen });

  // === SITE INFO ===
  sectionHeader("Site Information");
  const customerName = sanitize(d.customerName);
  const nameLines = wrapText(customerName, COL_W - 120, 9);
  checkPage(14 + nameLines.length * 13);
  y -= 14;
  drawText("Customer:", MARGIN, y, 8, fontBold, gray);
  for (const line of nameLines) {
    drawText(line, MARGIN + 120, y, 9);
    y -= 13;
  }
  y += 13;

  fieldRow("Address:", `${d.address || ""}, ${d.city || ""}, ${d.state || "CO"} ${d.zip || ""}`, 120);
  fieldRowDouble(
    "Project Date:",
    d.projectDate ? new Date(d.projectDate).toLocaleDateString("en-US") : "N/A",
    "Miles from Shop:",
    d.milesFromShop != null ? `${d.milesFromShop} mi` : "N/A",
  );
  fieldRowDouble("Payment Type:", d.paymentType || "N/A", "Type of Loss:", d.lossType || "N/A");
  if (d.estimateId) fieldRow("Estimate ID:", d.estimateId, 120);

  // === SITE CONDITIONS ===
  sectionHeader("Site Conditions");
  fieldRowDouble("Days Needed:", String(d.daysNeeded || 0), "Crew Size:", String(d.crewSize || 0));
  fieldRowDouble("Hours/Day:", String(d.hoursPerDay || 8), "Drive Time:", `${d.driveTimeHours || 0} hrs`);
  fieldRowDouble("Difficulty:", `${d.difficultyRating || 1} / 5`, "Permit Required:", d.permitNeeded || "N/A");
  fieldRowDouble("Septic System:", d.septicSystem ? "Yes" : "No", "Vacate Property:", d.vacateProperty || "N/A");
  fieldRowDouble("Power Available:", d.powerAvailable !== false ? "Yes" : "No", "Water Source:", d.waterSource !== false ? "Yes" : "No");
  fieldRowDouble("Air Clearances:", d.airClearances || "N/A", "NAMs Count:", String(d.namsCount || 0));
  fieldRowDouble("Asbestos Dumpster:", d.asbestosDumpster ? "Yes" : "No", "Portable Bathroom:", d.portableBathroom ? "Yes" : "No");
  if (d.dumpsterPlacement) fieldRow("Dumpster Placement:", d.dumpsterPlacement, 140);
  if (d.directLoadOut) fieldRow("Direct Load Out:", d.directLoadOut, 140);

  const wasteDisplay = d.wasteDescription || (d.wasteYards ? `${d.wasteYards} cubic yards` : "N/A");
  fieldRow("Waste:", wasteDisplay, 120);

  if (d.scopeOfWork) {
    sectionHeader("Scope of Work");
    longField("", d.scopeOfWork);
  }

  if (d.fieldNotes) {
    sectionHeader("Field Notes");
    longField("", d.fieldNotes);
  }

  // === LABOR ===
  sectionHeader("Labor Breakdown");
  const supReg = d.supervisorHours || 0;
  const supOt = d.supervisorOtHours || 0;
  const techReg = d.technicianHours || 0;
  const techOt = d.technicianOtHours || 0;

  const supRate = LABOR_RATES.supervisor.hourly + LABOR_RATES.supervisor.taxBurden;
  const supOtRate = LABOR_RATES.supervisor.hourly * 1.5 + LABOR_RATES.supervisor.taxBurden;
  const techRate = LABOR_RATES.technician.hourly + LABOR_RATES.technician.taxBurden;
  const techOtRate = LABOR_RATES.technician.hourly * 1.5 + LABOR_RATES.technician.taxBurden;

  const supCost = supReg * supRate + supOt * supOtRate;
  const techCost = techReg * techRate + techOt * techOtRate;
  const totalHours = supReg + supOt + techReg + techOt;

  // Table header
  checkPage(80);
  y -= 16;
  const colX = [MARGIN, MARGIN + 140, MARGIN + 220, MARGIN + 310, MARGIN + 400];
  drawText("Role", colX[0], y, 8, fontBold, gray);
  drawText("Reg Hours", colX[1], y, 8, fontBold, gray);
  drawText("OT Hours", colX[2], y, 8, fontBold, gray);
  drawText("Rate", colX[3], y, 8, fontBold, gray);
  drawText("Cost", colX[4], y, 8, fontBold, gray);
  y -= 2;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: lightGray });

  // Supervisor
  y -= 14;
  drawText("Supervisor", colX[0], y, 9);
  drawText(String(supReg), colX[1], y, 9);
  drawText(String(supOt), colX[2], y, 9);
  drawText(`${fmt(supRate)}/hr`, colX[3], y, 8, font, gray);
  drawText(fmt(supCost), colX[4], y, 9, fontBold);

  // Technician
  y -= 14;
  drawText("Technician", colX[0], y, 9);
  drawText(String(techReg), colX[1], y, 9);
  drawText(String(techOt), colX[2], y, 9);
  drawText(`${fmt(techRate)}/hr`, colX[3], y, 8, font, gray);
  drawText(fmt(techCost), colX[4], y, 9, fontBold);

  // Labor total
  y -= 4;
  page.drawLine({ start: { x: colX[4], y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: lightGray });
  y -= 14;
  drawText("Total Labor", colX[0], y, 9, fontBold);
  drawText(`${totalHours} hrs`, colX[1], y, 9);
  const laborTotal = d.laborCost ?? supCost + techCost;
  drawText(fmt(laborTotal), colX[4], y, 9, fontBold, brandGreen);

  // === OPERATING COSTS ===
  const opsRate = d.opsPerHourRate || 0;
  const opsCost = d.opsCost ?? totalHours * opsRate;
  if (opsCost > 0) {
    sectionHeader("Operating Costs");
    fieldRow("Per-Hour Rate:", fmt(opsRate), 120);
    fieldRow("Total Hours:", String(totalHours), 120);
    fieldRow("Operating Cost:", fmt(opsCost), 120);
  }

  // === COGS ===
  const cogsArr: Array<{ item: string; qty: number; cost: number; notes?: string }> = Array.isArray(d.cogs) ? d.cogs : [];
  const activeCogsItems = cogsArr.filter((c: any) => c.cost > 0 || c.qty > 0);
  if (activeCogsItems.length > 0) {
    sectionHeader("Cost of Goods Sold (COGS)");
    checkPage(20 + activeCogsItems.length * 14);
    y -= 16;
    const cogsCols = [MARGIN, MARGIN + 200, MARGIN + 280, MARGIN + 380];
    drawText("Item", cogsCols[0], y, 8, fontBold, gray);
    drawText("Qty", cogsCols[1], y, 8, fontBold, gray);
    drawText("Notes", cogsCols[2], y, 8, fontBold, gray);
    drawText("Cost", cogsCols[3], y, 8, fontBold, gray);
    y -= 2;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: lightGray });

    for (const item of activeCogsItems) {
      checkPage(16);
      y -= 14;
      drawText(sanitize(item.item), cogsCols[0], y, 9);
      drawText(String(item.qty || 0), cogsCols[1], y, 9);
      drawText(sanitize(item.notes || ""), cogsCols[2], y, 8, font, gray);
      drawText(fmt(item.cost || 0), cogsCols[3], y, 9);
    }

    const cogsTotal = d.cogsCost ?? activeCogsItems.reduce((s: number, i: any) => s + (i.cost || 0), 0);
    y -= 4;
    page.drawLine({ start: { x: cogsCols[3], y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: lightGray });
    y -= 14;
    drawText("COGS Total", cogsCols[0], y, 9, fontBold);
    drawText(fmt(cogsTotal), cogsCols[3], y, 9, fontBold, brandGreen);
  }

  // === MATERIALS ===
  const matsArr: Array<{ name: string; unit?: string; qty: number; unitPrice?: number; cost?: number }> = Array.isArray(d.materials) ? d.materials : [];
  const activeMats = matsArr.filter((m: any) => (m.cost || 0) > 0 || (m.qty || 0) > 0);
  if (activeMats.length > 0) {
    sectionHeader("Materials");
    checkPage(20 + activeMats.length * 14);
    y -= 16;
    const matCols = [MARGIN, MARGIN + 200, MARGIN + 260, MARGIN + 320, MARGIN + 400];
    drawText("Material", matCols[0], y, 8, fontBold, gray);
    drawText("Unit", matCols[1], y, 8, fontBold, gray);
    drawText("Qty", matCols[2], y, 8, fontBold, gray);
    drawText("Unit Price", matCols[3], y, 8, fontBold, gray);
    drawText("Cost", matCols[4], y, 8, fontBold, gray);
    y -= 2;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: lightGray });

    for (const mat of activeMats) {
      checkPage(16);
      y -= 14;
      const nameText = sanitize(mat.name);
      if (font.widthOfTextAtSize(nameText, 8) > 195) {
        drawText(nameText.substring(0, 35) + "...", matCols[0], y, 8);
      } else {
        drawText(nameText, matCols[0], y, 8);
      }
      drawText(sanitize(mat.unit || ""), matCols[1], y, 8, font, gray);
      drawText(String(Math.round((mat.qty || 0) * 100) / 100), matCols[2], y, 8);
      drawText(mat.unitPrice != null ? fmt(mat.unitPrice) : "", matCols[3], y, 8, font, gray);
      const matCost = mat.cost ?? (mat.qty || 0) * (mat.unitPrice || 0);
      drawText(fmt(matCost), matCols[4], y, 9);
    }

    const matsTotal = d.materialCost ?? activeMats.reduce((s: number, m: any) => s + (m.cost ?? (m.qty || 0) * (m.unitPrice || 0)), 0);
    y -= 4;
    page.drawLine({ start: { x: matCols[4], y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: lightGray });
    y -= 14;
    drawText("Materials Total", matCols[0], y, 9, fontBold);
    drawText(fmt(matsTotal), matCols[4], y, 9, fontBold, brandGreen);
  }

  // === PRICING SUMMARY ===
  sectionHeader("Pricing Summary");
  const cogsTotal = d.cogsCost ?? cogsArr.reduce((s: number, i: any) => s + (i.cost || 0), 0);
  const matsTotal = d.materialCost ?? matsArr.reduce((s: number, m: any) => s + (m.cost ?? (m.qty || 0) * (m.unitPrice || 0)), 0);
  const grandTotal = d.totalCost ?? laborTotal + opsCost + cogsTotal + matsTotal;

  checkPage(120);
  y -= 14;
  drawText("Labor Cost:", MARGIN, y, 9, fontBold, gray);
  drawText(fmt(laborTotal), MARGIN + 200, y, 9);
  if (opsCost > 0) {
    y -= 14;
    drawText("Operating Costs:", MARGIN, y, 9, fontBold, gray);
    drawText(fmt(opsCost), MARGIN + 200, y, 9);
  }
  y -= 14;
  drawText("COGS:", MARGIN, y, 9, fontBold, gray);
  drawText(fmt(cogsTotal), MARGIN + 200, y, 9);
  y -= 14;
  drawText("Materials:", MARGIN, y, 9, fontBold, gray);
  drawText(fmt(matsTotal), MARGIN + 200, y, 9);

  y -= 6;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 280, y }, thickness: 1, color: lightGray });
  y -= 16;
  drawText("Total Internal Cost:", MARGIN, y, 10, fontBold);
  drawText(fmt(grandTotal), MARGIN + 200, y, 10, fontBold);

  // Customer pricing
  const autoMarkup = 15 + (d.difficultyRating || 3);
  const hasOverride = d.customerPriceOverride != null && d.customerPriceOverride > 0;
  const customerPrice = hasOverride
    ? d.customerPriceOverride
    : (d.customerPrice ?? grandTotal * (1 + autoMarkup / 100));
  const effectiveMarkup = grandTotal > 0
    ? Math.round(((customerPrice - grandTotal) / grandTotal) * 1000) / 10
    : autoMarkup;
  const profitMargin = customerPrice > 0 ? ((customerPrice - grandTotal) / customerPrice * 100) : 0;

  y -= 20;
  drawText("Customer Price:", MARGIN, y, 11, fontBold, brandGreen);
  drawText(fmt(customerPrice), MARGIN + 200, y, 11, fontBold, brandGreen);
  y -= 14;
  drawText("Markup:", MARGIN, y, 9, fontBold, gray);
  drawText(`${effectiveMarkup.toFixed(1)}%`, MARGIN + 200, y, 9);
  y -= 14;
  drawText("Profit Margin:", MARGIN, y, 9, fontBold, gray);
  drawText(`${profitMargin.toFixed(1)}%`, MARGIN + 200, y, 9);

  if (d.serviceDescription) {
    y -= 14;
    drawText("Service:", MARGIN, y, 9, fontBold, gray);
    drawText(sanitize(d.serviceDescription), MARGIN + 200, y, 9);
  }

  // Footer on each page
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: PAGE_W - MARGIN - 60, y: 30, size: 7, font, color: gray,
    });
    p.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: MARGIN, y: 30, size: 7, font, color: gray,
    });
  });

  const pdfBytes = await pdf.save();
  const custSlug = (d.customerName || "estimate").replace(/\s+/g, "-").slice(0, 30);
  const filename = `Consultation-Estimate-${custSlug}.pdf`;

  return new NextResponse(new Uint8Array(Buffer.from(pdfBytes)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
