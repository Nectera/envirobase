import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { FIT_TEST_ITEMS } from "@/lib/respirator-fit-tests";
import { COMPANY_NAME } from "@/lib/branding";

export const dynamic = "force-dynamic";

function wrapText(text: string, maxWidth: number): string[] {
  const charsPerLine = Math.floor(maxWidth / 4.5);
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= charsPerLine) {
      lines.push(remaining);
      break;
    }
    let breakAt = remaining.lastIndexOf(" ", charsPerLine);
    if (breakAt <= 0) breakAt = charsPerLine;
    lines.push(remaining.substring(0, breakAt));
    remaining = remaining.substring(breakAt).trimStart();
  }
  return lines;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const item = await prisma.respiratorFitTest.findUnique({
      where: orgWhere(orgId, { id: params.id }),
      include: { worker: true }
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const indigo = rgb(0.31, 0.27, 0.9);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const lineGray = rgb(0.85, 0.85, 0.85);
    const darkGray = rgb(0.2, 0.2, 0.2);

    let page = pdf.addPage([612, 792]);
    let y = 740;

    const checkPage = (needed: number) => {
      if (y < needed) {
        page.drawText(`${COMPANY_NAME} — Respirator Fit Test`, {
          x: 50,
          y: 30,
          font,
          size: 7,
          color: gray
        });
        page = pdf.addPage([612, 792]);
        y = 740;
      }
    }

    // Header
    page.drawText(COMPANY_NAME, {
      x: 50,
      y,
      font: fontBold,
      size: 14,
      color: indigo
    });
    y -= 14;
    page.drawText("903 5th St., Greeley, CO 80631", {
      x: 50,
      y,
      font,
      size: 8,
      color: gray
    });
    y -= 22;
    page.drawText("Respirator Fit Test", {
      x: 50,
      y,
      font: fontBold,
      size: 14,
      color: black
    });
    y -= 20;

    // Project Info Box
    checkPage(100);
    const boxX = 50;
    const boxY = y;
    const boxHeight = 90;
    page.drawRectangle({
      x: boxX,
      y: boxY - boxHeight,
      width: 512,
      height: boxHeight,
      color: lightGray,
      borderColor: lineGray,
      borderWidth: 1
    });

    let boxInnerY = boxY - 8;
    const infoLines = [
      ["Branch Location", item.branchLocation],
      ["Job Address", item.jobAddress],
      ["Project Name", item.projectName],
      ["Project Supervisor", item.projectSupervisor],
      ["Project Manager", item.projectManager],
      ["Project Number", item.projectNumber]
    ];

    for (const [label, value] of infoLines) {
      page.drawText(`${label}:`, {
        x: boxX + 8,
        y: boxInnerY,
        font: fontBold,
        size: 7,
        color: darkGray
      });
      page.drawText(String(value || "—"), {
        x: boxX + 130,
        y: boxInnerY,
        font,
        size: 7,
        color: black,
        maxWidth: 380
      });
      boxInnerY -= 13;
    }

    y = boxY - boxHeight - 14;

    // General Section
    checkPage(40);
    page.drawText("General", {
      x: 50,
      y,
      font: fontBold,
      size: 10,
      color: black
    });
    y -= 14;

    const generalLines = [
      ["Supervisor", item.supervisor],
      ["Test Date", new Date(item.testDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })]
    ];

    for (const [label, value] of generalLines) {
      page.drawText(`${label}:`, {
        x: 50,
        y,
        font: fontBold,
        size: 8,
        color: gray
      });
      page.drawText(String(value || "—"), {
        x: 160,
        y,
        font,
        size: 9,
        color: black
      });
      y -= 13;
    }
    y -= 6;

    page.drawLine({
      start: { x: 50, y },
      end: { x: 562, y },
      color: lineGray,
      thickness: 1
    });
    y -= 12;

    // Employee Info
    checkPage(50);
    page.drawText("Employee Information", {
      x: 50,
      y,
      font: fontBold,
      size: 10,
      color: black
    });
    y -= 14;

    const empLines = [
      ["Name", item.employeeName],
      ["Type of Respirator", item.respiratorType],
      ["Size", item.respiratorSize]
    ];

    for (const [label, value] of empLines) {
      page.drawText(`${label}:`, {
        x: 50,
        y,
        font: fontBold,
        size: 8,
        color: gray
      });
      page.drawText(String(value || "—"), {
        x: 160,
        y,
        font,
        size: 9,
        color: black
      });
      y -= 13;
    }
    y -= 6;

    page.drawLine({
      start: { x: 50, y },
      end: { x: 562, y },
      color: lineGray,
      thickness: 1
    });
    y -= 12;

    // Test Results Table
    checkPage(150);
    page.drawText("Fit Test Results", {
      x: 50,
      y,
      font: fontBold,
      size: 10,
      color: black
    });
    y -= 14;

    // Table header
    const colWidth = 160;
    page.drawText("Test Type", {
      x: 50,
      y,
      font: fontBold,
      size: 7,
      color: gray
    });
    page.drawText("Pass", {
      x: 210,
      y,
      font: fontBold,
      size: 7,
      color: gray
    });
    page.drawText("Fail", {
      x: 280,
      y,
      font: fontBold,
      size: 7,
      color: gray
    });
    page.drawText("N/A", {
      x: 350,
      y,
      font: fontBold,
      size: 7,
      color: gray
    });

    y -= 4;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 380, y },
      color: lineGray,
      thickness: 0.5
    });
    y -= 11;

    // Test result rows
    for (const testItem of FIT_TEST_ITEMS) {
      checkPage(30);
      const result = (item.testResults || {})[testItem.key] || "—";
      const resultColor = result === "pass" ? rgb(0.1, 0.6, 0.2) : result === "fail" ? rgb(0.8, 0.2, 0.1) : gray;
      const resultSymbol = result === "pass" ? "✓" : result === "fail" ? "✗" : "—";

      page.drawText(testItem.label, {
        x: 50,
        y,
        font,
        size: 8,
        color: black
      });
      page.drawText(result === "pass" ? "✓" : "", {
        x: 215,
        y,
        font: fontBold,
        size: 10,
        color: result === "pass" ? rgb(0.1, 0.6, 0.2) : gray
      });
      page.drawText(result === "fail" ? "✗" : "", {
        x: 285,
        y,
        font: fontBold,
        size: 10,
        color: result === "fail" ? rgb(0.8, 0.2, 0.1) : gray
      });
      page.drawText(result === "na" ? "N/A" : "", {
        x: 355,
        y,
        font,
        size: 7,
        color: gray
      });

      y -= 12;
    }

    y -= 6;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 380, y },
      color: lineGray,
      thickness: 1
    });
    y -= 12;

    // Comments
    if (item.comments) {
      checkPage(50);
      page.drawText("Comments", {
        x: 50,
        y,
        font: fontBold,
        size: 8,
        color: black
      });
      y -= 11;
      const commentLines = wrapText(item.comments, 500);
      for (const line of commentLines) {
        checkPage(20);
        page.drawText(line, {
          x: 50,
          y,
          font,
          size: 8,
          color: black,
          maxWidth: 500
        });
        y -= 11;
      }
      y -= 6;
    }

    page.drawLine({
      start: { x: 50, y },
      end: { x: 562, y },
      color: lineGray,
      thickness: 1
    });
    y -= 12;

    // Inspection Performed By
    checkPage(60);
    page.drawText("Inspection Performed By", {
      x: 50,
      y,
      font: fontBold,
      size: 9,
      color: black
    });
    y -= 13;
    page.drawText(`Name: ${item.performedByName || "—"}`, {
      x: 50,
      y,
      font,
      size: 8,
      color: black
    });
    y -= 11;
    page.drawText(`Date: ${item.performedByDate ? new Date(item.performedByDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}`, {
      x: 50,
      y,
      font,
      size: 8,
      color: black
    });
    y -= 14;

    // OSHA Compliance Text
    checkPage(60);
    const complianceText = "I certify that I have conducted the respirator fit test in accordance with OSHA 29 CFR 1910.134 Appendix A. The employee has demonstrated an adequate seal between the respirator facepiece and face for each test exercise at a fit factor of at least 100. No discrepancies were noted.";
    const complianceLines = wrapText(complianceText, 500);
    for (const line of complianceLines) {
      checkPage(20);
      page.drawText(line, {
        x: 50,
        y,
        font,
        size: 7,
        color: gray
      });
      y -= 10;
    }
    y -= 6;

    page.drawLine({
      start: { x: 50, y },
      end: { x: 562, y },
      color: lineGray,
      thickness: 1
    });
    y -= 12;

    // Employee Attestation
    checkPage(60);
    page.drawText("Employee Attestation", {
      x: 50,
      y,
      font: fontBold,
      size: 9,
      color: black
    });
    y -= 13;
    const attestationText = "I have received training in the proper use, care, and maintenance of the respiratory protection equipment assigned to me. I understand the hazards for which the respirator is needed and the limitations of the equipment. I have successfully completed a fit test with the assigned respirator.";
    const attestationLines = wrapText(attestationText, 500);
    for (const line of attestationLines) {
      checkPage(20);
      page.drawText(line, {
        x: 50,
        y,
        font,
        size: 7,
        color: gray
      });
      y -= 10;
    }
    y -= 6;

    page.drawText(`Employee Signature Date: ${item.employeeSignDate ? new Date(item.employeeSignDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}`, {
      x: 50,
      y,
      font: fontBold,
      size: 8,
      color: black
    });

    // Footer
    page.drawText(`Generated ${new Date().toLocaleString("en-US")}`, {
      x: 50,
      y: 30,
      font,
      size: 7,
      color: gray
    });
    page.drawText(`${COMPANY_NAME} — Confidential`, {
      x: 350,
      y: 30,
      font,
      size: 7,
      color: gray
    });

    const pdfBytes = await pdf.save();
    const filename = `Respirator-Fit-Test-${item.testDate}-${item.employeeName?.replace(/\s+/g, "-").slice(0, 30) || "test"}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    logger.error("PDF generation error:", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
