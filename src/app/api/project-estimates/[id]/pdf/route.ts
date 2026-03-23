import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

/**
 * GET /api/project-estimates/[id]/pdf
 *
 * Generates a branded PDF of the estimate suitable for
 * sending to insurance carriers or clients.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const estimate = await prisma.projectEstimate.findFirst({
    where: { id: params.id, organizationId: orgId },
    include: {
      lineItems: {
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      },
      project: {
        select: {
          name: true,
          projectNumber: true,
          address: true,
          client: true,
          type: true,
        },
      },
    },
  });

  if (!estimate)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch org info for branding
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, brandColor: true },
  });
  const orgName = org?.name || "Estimate";
  const orgNameUpper = orgName.toUpperCase();

  // Fetch carrier info for the project
  let carrier: any = null;
  try {
    carrier = await prisma.carrierInfo.findFirst({
      where: { projectId: estimate.projectId, organizationId: orgId },
    });
  } catch {}

  const project = estimate.project as any;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Brand colors — parse org brandColor or use default green
  let brandR = 0.484, brandG = 0.757, brandB = 0.263; // default #7BC143
  if (org?.brandColor) {
    const hex = (org.brandColor as string).replace("#", "");
    if (hex.length === 6) {
      brandR = parseInt(hex.slice(0, 2), 16) / 255;
      brandG = parseInt(hex.slice(2, 4), 16) / 255;
      brandB = parseInt(hex.slice(4, 6), 16) / 255;
    }
  }
  const BRAND = rgb(brandR, brandG, brandB);
  const DARK = rgb(0.15, 0.15, 0.15);
  const GRAY = rgb(0.4, 0.4, 0.4);
  const LIGHT_GRAY = rgb(0.92, 0.92, 0.92);
  const WHITE = rgb(1, 1, 1);

  const PAGE_W = 612; // letter
  const PAGE_H = 792;
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // ── Helper functions ──

  function drawText(
    text: string,
    x: number,
    yPos: number,
    options: {
      font?: PDFFont;
      size?: number;
      color?: ReturnType<typeof rgb>;
      maxWidth?: number;
    } = {}
  ) {
    const f = options.font || font;
    const size = options.size || 10;
    const color = options.color || DARK;
    page.drawText(text, { x, y: yPos, size, font: f, color });
  }

  function drawLine(x1: number, yPos: number, x2: number, color = LIGHT_GRAY, thickness = 0.5) {
    page.drawLine({
      start: { x: x1, y: yPos },
      end: { x: x2, y: yPos },
      thickness,
      color,
    });
  }

  function drawRect(x: number, yPos: number, w: number, h: number, color: ReturnType<typeof rgb>) {
    page.drawRectangle({ x, y: yPos, width: w, height: h, color });
  }

  function textWidth(text: string, f: PDFFont, size: number) {
    return f.widthOfTextAtSize(text, size);
  }

  function rightAlign(text: string, f: PDFFont, size: number, rightX: number) {
    return rightX - textWidth(text, f, size);
  }

  function checkPageBreak(needed: number) {
    if (y - needed < MARGIN + 30) {
      addPageNumber();
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      return true;
    }
    return false;
  }

  let pageCount = 0;
  function addPageNumber() {
    pageCount++;
    const text = `Page ${pageCount}`;
    const x = rightAlign(text, font, 8, PAGE_W - MARGIN);
    page.drawText(text, { x, y: 20, size: 8, font, color: GRAY });
  }

  // ── Header: Branded bar with org name ──
  drawRect(0, PAGE_H - 70, PAGE_W, 70, BRAND);

  // Split org name for display if it's long, otherwise just show it
  const orgWords = orgNameUpper.split(" ");
  if (orgWords.length > 2) {
    // Show first word large, rest smaller below
    drawText(orgWords[0], 50, PAGE_H - 42, { font: fontBold, size: 22, color: WHITE });
    drawText(orgWords.slice(1).join(" "), 50, PAGE_H - 58, { font: font, size: 10, color: WHITE });
  } else {
    drawText(orgNameUpper, 50, PAGE_H - 48, { font: fontBold, size: 18, color: WHITE });
  }

  // Estimate label on right side of header
  const estLabel = `ESTIMATE #${estimate.number}`;
  const estLabelX = rightAlign(estLabel, fontBold, 14, PAGE_W - 50);
  drawText(estLabel, estLabelX, PAGE_H - 42, { font: fontBold, size: 14, color: WHITE });

  const typeLabel = estimate.type === "supplement" ? "SUPPLEMENT" : "ORIGINAL";
  const typeLabelX = rightAlign(typeLabel, font, 9, PAGE_W - 50);
  drawText(typeLabel, typeLabelX, PAGE_H - 55, { font: font, size: 9, color: WHITE });

  y = PAGE_H - 95;

  // ── Project & Carrier Info (two columns) ──
  const colLeft = MARGIN;
  const colRight = PAGE_W / 2 + 20;

  // Left column: Project info
  drawText("PROJECT INFORMATION", colLeft, y, { font: fontBold, size: 9, color: BRAND });
  y -= 16;

  const infoRows: [string, string][] = [
    ["Project:", project?.name || "—"],
    ["Project #:", project?.projectNumber || "—"],
    ["Address:", project?.address || "—"],
    ["Client:", project?.client || "—"],
    ["Type:", (project?.type || "—").replace(/_/g, " ")],
    ["Status:", estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)],
    ["Date:", new Date(estimate.createdAt).toLocaleDateString("en-US")],
  ];

  if (estimate.title) {
    infoRows.splice(1, 0, ["Title:", estimate.title]);
  }

  for (const [label, value] of infoRows) {
    drawText(label, colLeft, y, { font: fontBold, size: 9, color: GRAY });
    drawText(value, colLeft + 65, y, { size: 9 });
    y -= 14;
  }

  // Right column: Carrier info (if available)
  let carrierY = PAGE_H - 95;
  if (carrier) {
    drawText("INSURANCE CARRIER", colRight, carrierY, { font: fontBold, size: 9, color: BRAND });
    carrierY -= 16;

    const carrierRows: [string, string][] = [
      ["Carrier:", carrier.carrierName || "—"],
      ["Adjuster:", carrier.adjusterName || "—"],
      ["Phone:", carrier.adjusterPhone || "—"],
      ["Email:", carrier.adjusterEmail || "—"],
      ["Claim #:", carrier.claimNumber || "—"],
      ["Policy #:", carrier.policyNumber || "—"],
      ["Date of Loss:", carrier.dateOfLoss || "—"],
    ];

    if (carrier.deductible) {
      carrierRows.push(["Deductible:", `$${Number(carrier.deductible).toFixed(2)}`]);
    }

    for (const [label, value] of carrierRows) {
      drawText(label, colRight, carrierY, { font: fontBold, size: 9, color: GRAY });
      drawText(value, colRight + 75, carrierY, { size: 9 });
      carrierY -= 14;
    }
  }

  // Move y below whichever column is lower
  y = Math.min(y, carrierY) - 15;
  drawLine(MARGIN, y, PAGE_W - MARGIN, BRAND, 1);
  y -= 20;

  // ── Line Items Table ──
  drawText("LINE ITEMS", MARGIN, y, { font: fontBold, size: 11, color: DARK });
  y -= 20;

  // Table column layout
  const COL = {
    code: MARGIN,
    desc: MARGIN + 75,
    room: MARGIN + 280,
    qty: MARGIN + 345,
    unit: MARGIN + 380,
    price: MARGIN + 410,
    total: MARGIN + 465,
  };
  const TABLE_RIGHT = PAGE_W - MARGIN;

  // Table header
  function drawTableHeader() {
    drawRect(MARGIN, y - 3, CONTENT_W, 16, BRAND);
    const hy = y;
    drawText("Code", COL.code + 3, hy, { font: fontBold, size: 8, color: WHITE });
    drawText("Description", COL.desc + 3, hy, { font: fontBold, size: 8, color: WHITE });
    drawText("Room", COL.room + 3, hy, { font: fontBold, size: 8, color: WHITE });
    drawText("Qty", COL.qty + 3, hy, { font: fontBold, size: 8, color: WHITE });
    drawText("Unit", COL.unit + 3, hy, { font: fontBold, size: 8, color: WHITE });

    const priceLabel = "Unit Price";
    drawText(priceLabel, rightAlign(priceLabel, fontBold, 8, COL.total - 5), hy, { font: fontBold, size: 8, color: WHITE });

    const totalLabel = "Total";
    drawText(totalLabel, rightAlign(totalLabel, fontBold, 8, TABLE_RIGHT - 3), hy, { font: fontBold, size: 8, color: WHITE });

    y -= 20;
  }

  drawTableHeader();

  // Group items by category
  const catGroups: Record<string, typeof estimate.lineItems> = {};
  for (const li of estimate.lineItems) {
    const cat = li.category || "Other";
    if (!catGroups[cat]) catGroups[cat] = [];
    catGroups[cat].push(li);
  }

  let rowIndex = 0;
  for (const [category, items] of Object.entries(catGroups)) {
    // Category header
    checkPageBreak(30);
    drawRect(MARGIN, y - 3, CONTENT_W, 14, rgb(0.96, 0.96, 0.96));
    drawText(category, MARGIN + 3, y, { font: fontBold, size: 8, color: DARK });
    y -= 18;

    for (const li of items) {
      if (checkPageBreak(18)) {
        drawTableHeader();
      }

      // Alternating row background
      if (rowIndex % 2 === 0) {
        drawRect(MARGIN, y - 3, CONTENT_W, 14, rgb(0.98, 0.98, 0.98));
      }

      // Truncate long descriptions
      const maxDescWidth = COL.room - COL.desc - 8;
      let desc = li.description;
      while (textWidth(desc, font, 8) > maxDescWidth && desc.length > 3) {
        desc = desc.slice(0, -4) + "...";
      }

      const room = li.room || "";

      drawText(li.xactCode || "—", COL.code + 3, y, { size: 8, color: GRAY });
      drawText(desc, COL.desc + 3, y, { size: 8 });
      drawText(room, COL.room + 3, y, { size: 8, color: GRAY });
      drawText(li.quantity.toString(), COL.qty + 3, y, { size: 8 });
      drawText(li.unit, COL.unit + 3, y, { size: 8, color: GRAY });

      const priceStr = `$${li.unitPrice.toFixed(2)}`;
      drawText(priceStr, rightAlign(priceStr, font, 8, COL.total - 5), y, { size: 8 });

      const totalStr = `$${li.total.toFixed(2)}`;
      drawText(totalStr, rightAlign(totalStr, fontBold, 8, TABLE_RIGHT - 3), y, { font: fontBold, size: 8 });

      y -= 16;
      rowIndex++;
    }

    // Category subtotal
    checkPageBreak(18);
    drawLine(COL.price, y + 10, TABLE_RIGHT - 3, GRAY, 0.5);
    const catTotal = items.reduce((s: number, li: any) => s + li.total, 0);
    const catTotalStr = `$${catTotal.toFixed(2)}`;
    drawText(`${category} Subtotal:`, COL.price - 65, y, { font: fontBold, size: 8, color: GRAY });
    drawText(catTotalStr, rightAlign(catTotalStr, fontBold, 8, TABLE_RIGHT - 3), y, { font: fontBold, size: 8 });
    y -= 20;
  }

  // ── Grand Total ──
  checkPageBreak(50);
  drawLine(MARGIN, y + 5, TABLE_RIGHT, BRAND, 1.5);
  y -= 10;

  drawRect(MARGIN, y - 8, CONTENT_W, 28, rgb(0.96, 0.98, 0.94));
  const grandLabel = "TOTAL ESTIMATE:";
  drawText(grandLabel, MARGIN + 10, y, { font: fontBold, size: 12, color: DARK });
  const grandTotal = `$${estimate.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  drawText(grandTotal, rightAlign(grandTotal, fontBold, 14, TABLE_RIGHT - 10), y - 1, { font: fontBold, size: 14, color: BRAND });

  if (estimate.approvedAmount != null && estimate.status === "approved") {
    y -= 26;
    const approvedLabel = "APPROVED AMOUNT:";
    drawText(approvedLabel, MARGIN + 10, y, { font: fontBold, size: 10, color: GRAY });
    const approvedTotal = `$${estimate.approvedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    drawText(approvedTotal, rightAlign(approvedTotal, fontBold, 12, TABLE_RIGHT - 10), y, { font: fontBold, size: 12, color: rgb(0.1, 0.6, 0.3) });
  }

  y -= 30;

  // ── Notes ──
  if (estimate.notes) {
    checkPageBreak(40);
    drawText("NOTES", MARGIN, y, { font: fontBold, size: 9, color: BRAND });
    y -= 14;
    // Simple word-wrap for notes
    const words = estimate.notes.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (textWidth(test, font, 9) > CONTENT_W - 10) {
        drawText(line, MARGIN, y, { size: 9, color: GRAY });
        y -= 12;
        checkPageBreak(14);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      drawText(line, MARGIN, y, { size: 9, color: GRAY });
      y -= 12;
    }
  }

  // ── Footer ──
  checkPageBreak(40);
  y -= 10;
  drawLine(MARGIN, y, TABLE_RIGHT, LIGHT_GRAY, 0.5);
  y -= 14;
  drawText(
    `This estimate was prepared by ${orgName}.`,
    MARGIN,
    y,
    { size: 7, color: GRAY }
  );
  y -= 10;
  drawText(
    `Generated ${new Date().toLocaleDateString("en-US")} | Estimate #${estimate.number} | ${project?.name || ""}`,
    MARGIN,
    y,
    { size: 7, color: GRAY }
  );

  // Add page number to last page
  addPageNumber();

  // Serialize
  const pdfBytes = await pdfDoc.save();

  const safeName = (project?.name || "Estimate")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_");
  const filename = `${safeName}_Estimate_${estimate.number}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
