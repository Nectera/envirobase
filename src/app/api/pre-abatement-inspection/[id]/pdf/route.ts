import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { PRE_ABATEMENT_ITEMS, REMOVAL_TECHNIQUES } from "@/lib/pre-abatement-checklist";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { COMPANY_NAME } from "@/lib/branding";

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function wrapText(text: string, maxWidth: number, charWidth: number): string[] {
  if (!text) return [];
  const lines: string[] = [];
  const words = text.split(" ");
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? currentLine + " " + word : word;
    if ((testLine.length * charWidth) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const item = await prisma.preAbatementInspection.findUnique({ where: orgWhere(orgId, { id: params.id }), include: { project: true } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([612, 792]); // Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 40;
    let y = 750;
    const lineHeight = 14;

    // Header
    page.drawText(COMPANY_NAME, { x: margin, y, font: fontBold, size: 16, color: rgb(0.2, 0.4, 0.7) });
    y -= 20;
    page.drawText("Pre-Abatement Visual Inspection Checklist", { x: margin, y, font: fontBold, size: 12, color: rgb(0.1, 0.1, 0.1) });
    y -= 16;
    page.drawText("903 5th St., Greeley, CO 80631", { x: margin, y, font, size: 9, color: rgb(0.5, 0.5, 0.5) });
    y -= 20;

    // Project & Date Info
    page.drawText(`Project: ${item.project?.name || "—"}`, { x: margin, y, font, size: 10 });
    y -= lineHeight;
    page.drawText(`Address: ${item.project?.address || "—"}`, { x: margin, y, font, size: 10 });
    y -= lineHeight;
    page.drawText(`Date: ${formatDate(item.date)} | Inspector: ${item.inspector || "—"}`, { x: margin, y, font, size: 10 });
    y -= lineHeight;
    page.drawText(`Contractor Supervisor: ${item.contractorSupervisor || "—"} | Project Manager: ${item.projectManager || "—"}`, { x: margin, y, font, size: 10 });
    y -= 16;

    // Removal Techniques
    if (item.removalTechnique && item.removalTechnique.length > 0) {
      page.drawText("Removal Techniques:", { x: margin, y, font: fontBold, size: 10 });
      y -= lineHeight;
      const techniques = REMOVAL_TECHNIQUES.filter((t) => item.removalTechnique.includes(t.key)).map((t) => t.label).join(", ");
      page.drawText(techniques, { x: margin + 10, y, font, size: 10 });
      y -= 16;
    }

    // Checklist Items
    page.drawText("Inspection Checklist:", { x: margin, y, font: fontBold, size: 10 });
    y -= lineHeight;

    const colWidth = 350;
    const charWidth = 6;
    let col = 0;
    let pageY = y;

    for (const item_def of PRE_ABATEMENT_ITEMS) {
      const value = item.checklistItems?.[item_def.key] || "na";
      const valueStr = value === "yes" ? "Yes" : value === "no" ? "No" : "N/A";
      const color = value === "yes" ? rgb(0.2, 0.6, 0.2) : value === "no" ? rgb(0.8, 0.1, 0.1) : rgb(0.5, 0.5, 0.5);

      const lines = wrapText(`${item_def.label}: ${valueStr}`, colWidth - 10, charWidth);
      const itemHeight = lines.length * lineHeight;

      // Check if we need to move to next column or page
      if (pageY - itemHeight < 100) {
        if (col === 0) {
          col = 1;
          pageY = y;
        } else {
          col = 0;
          page = pdfDoc.addPage([612, 792]);
          y = 750;
          pageY = y;
        }
      }

      const xPos = col === 0 ? margin : margin + colWidth;

      for (let i = 0; i < lines.length; i++) {
        const textColor = i === lines.length - 1 ? color : rgb(0.1, 0.1, 0.1);
        const textSize = i === lines.length - 1 ? 9 : 9;
        page.drawText(lines[i], { x: xPos + 10, y: pageY, font, size: textSize, color: textColor, maxWidth: colWidth - 20 });
        pageY -= lineHeight;
      }

      pageY -= 2;
    }

    // Comments
    if (item.comments) {
      // Ensure we have space for comments
      if (pageY < 100) {
        page = pdfDoc.addPage([612, 792]);
        pageY = 750;
      }

      page.drawText("Comments:", { x: margin, y: pageY, font: fontBold, size: 10 });
      pageY -= lineHeight;

      const commentLines = wrapText(item.comments, 500, charWidth);
      for (const line of commentLines) {
        if (pageY < 40) {
          page = pdfDoc.addPage([612, 792]);
          pageY = 750;
        }
        page.drawText(line, { x: margin + 10, y: pageY, font, size: 9, maxWidth: 500 });
        pageY -= lineHeight;
      }
    }

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pre-abatement-inspection-${item.id}.pdf"`,
      },
    });
  } catch (error: any) {
    logger.error("PDF generation error:", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
