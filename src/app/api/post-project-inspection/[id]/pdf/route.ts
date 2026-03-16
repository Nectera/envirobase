import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { POST_PROJECT_SECTIONS } from "@/lib/post-project-checklist";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { COMPANY_NAME } from "@/lib/branding";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  return timeStr;
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

    const item = await prisma.postProjectInspection.findUnique({ where: orgWhere(orgId, { id: params.id }), include: { project: true } });
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
    page.drawText("903 5th St., Greeley, CO 80631", { x: margin, y, font, size: 9, color: rgb(0.5, 0.5, 0.5) });
    y -= 16;
    page.drawText("Post Project Inspection Guide (Project Manager)", { x: margin, y, font: fontBold, size: 12, color: rgb(0.1, 0.1, 0.1) });
    y -= 20;

    // Project & Client Info
    page.drawText(`Client Name: ${item.clientName || "—"}`, { x: margin, y, font, size: 10 });
    y -= lineHeight;
    page.drawText(`Client Address: ${item.clientAddress || "—"}`, { x: margin, y, font, size: 10 });
    y -= lineHeight;
    page.drawText(`Project Name: ${item.projectName || "—"}`, { x: margin, y, font, size: 10 });
    y -= lineHeight;
    page.drawText(`Project Manager: ${item.projectManagerName || "—"}`, { x: margin, y, font, size: 10 });
    y -= lineHeight;
    const inspectionDateTime = `${formatDate(item.inspectionDate)} ${formatTime(item.inspectionTime)}`.trim();
    page.drawText(`Inspection Date/Time: ${inspectionDateTime || "—"}`, { x: margin, y, font, size: 10 });
    y -= 16;

    // Checklist Sections
    const charWidth = 6;
    const contentWidth = 532; // 612 - 40 left - 40 right

    for (const section of POST_PROJECT_SECTIONS) {
      // Check if we need a new page
      if (y < 120) {
        page = pdfDoc.addPage([612, 792]);
        y = 750;
      }

      // Section header
      page.drawText(section.section, { x: margin, y, font: fontBold, size: 11, color: rgb(0.2, 0.4, 0.7) });
      y -= lineHeight + 4;

      // Section items
      for (const item_def of section.items) {
        const value = item.checklistItems?.[item_def.key] || "na";
        const valueStr = value === "yes" ? "Yes" : value === "no" ? "No" : "N/A";
        const color = value === "yes" ? rgb(0.2, 0.6, 0.2) : value === "no" ? rgb(0.8, 0.1, 0.1) : rgb(0.5, 0.5, 0.5);

        // Check if we need a new page
        if (y < 50) {
          page = pdfDoc.addPage([612, 792]);
          y = 750;
        }

        const lines = wrapText(`${item_def.label}: ${valueStr}`, contentWidth - 20, charWidth);
        for (let i = 0; i < lines.length; i++) {
          const textColor = i === lines.length - 1 ? color : rgb(0.1, 0.1, 0.1);
          page.drawText(lines[i], { x: margin + 10, y, font, size: 9, color: textColor, maxWidth: contentWidth - 20 });
          y -= lineHeight;
        }

        y -= 2;
      }

      y -= 8;
    }

    // Damage Details section
    if (item.damageNotes) {
      if (y < 80) {
        page = pdfDoc.addPage([612, 792]);
        y = 750;
      }

      page.drawText("Damage Details:", { x: margin, y, font: fontBold, size: 11, color: rgb(0.8, 0.1, 0.1) });
      y -= lineHeight;

      const damageLines = wrapText(item.damageNotes, contentWidth - 20, charWidth);
      for (const line of damageLines) {
        if (y < 40) {
          page = pdfDoc.addPage([612, 792]);
          y = 750;
        }
        page.drawText(line, { x: margin + 10, y, font, size: 9, maxWidth: contentWidth - 20 });
        y -= lineHeight;
      }

      y -= 8;
    }

    // Comments section
    if (item.comments) {
      if (y < 80) {
        page = pdfDoc.addPage([612, 792]);
        y = 750;
      }

      page.drawText("Comments:", { x: margin, y, font: fontBold, size: 11, color: rgb(0.1, 0.1, 0.1) });
      y -= lineHeight;

      const commentLines = wrapText(item.comments, contentWidth - 20, charWidth);
      for (const line of commentLines) {
        if (y < 40) {
          page = pdfDoc.addPage([612, 792]);
          y = 750;
        }
        page.drawText(line, { x: margin + 10, y, font, size: 9, maxWidth: contentWidth - 20 });
        y -= lineHeight;
      }

      y -= 8;
    }

    // PM Signature line
    if (y < 80) {
      page = pdfDoc.addPage([612, 792]);
      y = 750;
    }

    page.drawText("PM Signature: _______________________ Date: _________________", { x: margin, y, font, size: 10 });

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="post-project-inspection-${item.id}.pdf"`,
      },
    });
  } catch (error: any) {
    logger.error("PDF generation error:", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
