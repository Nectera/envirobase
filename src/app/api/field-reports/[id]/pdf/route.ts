import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { COMPANY_NAME } from "@/lib/branding";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await prisma.dailyFieldReport.findUnique({
      where: { id: params.id },
      include: { project: true },
    });
    if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Extract the data JSON fields — all form values are stored in the data column
    const d: any = (raw.data && typeof raw.data === "object") ? raw.data : {};
    // Keep original Prisma fields (id, projectId, date, status, project relation) accessible via raw
    // Access form fields via d.fieldName
    const report: any = {
      id: raw.id,
      projectId: raw.projectId,
      date: raw.date,
      status: raw.status,
      project: (raw as any).project,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      // Form fields from data JSON
      ...d,
    };

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
    const indigo = rgb(0.31, 0.33, 0.85);

    const checkPage = (needed: number) => {
      if (y - needed < MARGIN) {
        page = pdf.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
    }

    // Sanitize text for pdf-lib: must be a string, no newlines, only WinAnsi-safe chars
    const sanitize = (val: any): string => {
      if (val == null) return "";
      const str = typeof val === "string" ? val : (typeof val === "object" ? JSON.stringify(val) : String(val));
      // Remove newlines (pdf-lib crashes on them) and non-printable chars
      return str.replace(/[\n\r\t]/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
    };

    const drawText = (text: any, x: number, yPos: number, size: number, f = font, color = black) => {
      page.drawText(sanitize(text), { x, y: yPos, size, font: f, color });
    }

    const sectionHeader = (title: string) => {
      checkPage(30);
      y -= 8;
      page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: PAGE_W - MARGIN, y: y + 4 }, thickness: 1, color: lightGray });
      y -= 16;
      drawText(title, MARGIN, y, 11, fontBold, indigo);
      y -= 6;
    }

    const fieldRow = (label: string, value: any, labelWidth = 160) => {
      checkPage(16);
      y -= 14;
      drawText(label, MARGIN, y, 8, fontBold, gray);
      drawText(value || "N/A", MARGIN + labelWidth, y, 9, font, black);
    }

    const fieldRowDouble = (l1: string, v1: any, l2: string, v2: any) => {
      checkPage(16);
      y -= 14;
      drawText(l1, MARGIN, y, 8, fontBold, gray);
      drawText(v1 || "N/A", MARGIN + 120, y, 9);
      const midX = PAGE_W / 2 + 20;
      drawText(l2, midX, y, 8, fontBold, gray);
      drawText(v2 || "N/A", midX + 120, y, 9);
    }

    const wrapText = (text: string, maxWidth: number, size: number): string[]  => {
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
    }

    const longField = (label: string, value: any) => {
      const text = typeof value === "string" ? value : (value != null ? String(value) : "");
      // Handle multiline text (newlines in the content)
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
    }

    // === HEADER ===
    drawText(COMPANY_NAME, MARGIN, y, 14, fontBold);
    y -= 14;
    drawText("903 5th St., Greeley, CO 80631", MARGIN, y, 8, font, gray);
    y -= 22;
    drawText("Daily Field Report", MARGIN, y, 16, fontBold, indigo);
    y -= 4;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 2, color: indigo });

    // === JOB INFO ===
    sectionHeader("Job Information");
    fieldRowDouble("Job Name:", report.project?.name, "Supervisor:", report.supervisorName);
    fieldRowDouble("Date:", new Date(report.date).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }), "Project Manager:", report.projectManagerName);

    // === WEATHER ===
    if (report.weatherCurrentTemp) {
      sectionHeader("Weather Conditions");
      checkPage(16);
      y -= 14;
      drawText("Temp:", MARGIN, y, 8, fontBold, gray);
      drawText(report.weatherCurrentTemp || "N/A", MARGIN + 50, y, 9);
      const wx1 = MARGIN + 150;
      drawText("Wind:", wx1, y, 8, fontBold, gray);
      drawText(report.weatherCurrentWind || "N/A", wx1 + 45, y, 9);
      const wx2 = wx1 + 165;
      drawText("Conditions:", wx2, y, 8, fontBold, gray);
      drawText(report.weatherCurrentCondition || "N/A", wx2 + 75, y, 9);
      y -= 14;
      drawText("Humidity:", MARGIN, y, 8, fontBold, gray);
      drawText(report.weatherCurrentHumidity || "N/A", MARGIN + 65, y, 9);
      drawText("Heat Index:", MARGIN + 150, y, 8, fontBold, gray);
      drawText(report.weatherCurrentHeatIndex || "N/A", MARGIN + 230, y, 9);
    }

    // === SCOPE ===
    sectionHeader("Scope of Work");
    fieldRowDouble("Scope Received:", report.scopeReceived ? "Yes" : "No", "Scope Date:", report.scopeDate ? new Date(report.scopeDate).toLocaleDateString() : "N/A");
    longField("Detailed Description:", report.scopeDescription);
    fieldRow("Work Area Locations:", Array.isArray(report.workAreaLocations) ? report.workAreaLocations.join(", ") : (report.workAreaLocations || "N/A"));

    // === TIMELINE ===
    sectionHeader("Project Timeline");
    checkPage(16);
    y -= 14;
    drawText("Est. Completion:", MARGIN, y, 8, fontBold, gray);
    drawText(report.estimatedCompletionDate ? new Date(report.estimatedCompletionDate).toLocaleDateString() : "N/A", MARGIN + 120, y, 9);
    const midX2 = PAGE_W / 2 - 30;
    drawText("Days Remaining:", midX2, y, 8, fontBold, gray);
    drawText(report.daysRemaining != null ? `${report.daysRemaining}` : "N/A", midX2 + 100, y, 9);
    const rightX = PAGE_W - MARGIN - 120;
    drawText("Est. Hours:", rightX, y, 8, fontBold, gray);
    drawText(report.estimatedHoursTotal != null ? `${report.estimatedHoursTotal}` : "N/A", rightX + 70, y, 9);

    // === WORK ===
    sectionHeader("Work Completed Today");
    fieldRow("Summary:", report.workCompletedToday);

    sectionHeader("Workflow");
    longField("", report.workflow);

    // === SHIFT REVIEW ===
    sectionHeader("End of Shift Review");
    longField("Review:", report.shiftReview);
    y -= 6;
    fieldRow("Incident:", report.incident ? `Yes — ${report.incidentDetails || "See details"}` : "No");
    fieldRow("Stop Work:", report.stopWork ? `Yes — ${report.stopWorkDetails || "See details"}` : "No");

    // === GOALS ===
    sectionHeader("Goals");
    longField("Goals for Tomorrow:", report.goalsForTomorrow);
    longField("Goals for the Week:", report.goalsForWeek);

    // === NOTES ===
    sectionHeader("Notes, Meetings & Visitors");
    longField("Project Notes:", report.projectNotes);
    longField("Meeting Log:", report.meetingLog);
    fieldRow("Visitors:", report.visitors);

    // === EQUIPMENT & MONITORING ===
    sectionHeader("Equipment & Monitoring");
    fieldRowDouble("Neg. Air Machines:", report.negativeAirMachineCount != null ? String(report.negativeAirMachineCount) : "N/A", "Neg. Air Established:", report.negativeAirEstablished ? "Yes" : "No");
    longField("Equipment Malfunctions:", report.equipmentMalfunctions);
    if (report.manometerPhoto) {
      const mPhoto = typeof report.manometerPhoto === "object" ? (report.manometerPhoto.filename || "Uploaded") : report.manometerPhoto;
      fieldRow("Manometer Photo:", mPhoto);
    }

    // === ASBESTOS ===
    sectionHeader("Asbestos Identified in Work Area");
    longField("", report.asbestosInWorkArea);

    // === PHOTOS ===
    const photoArray = Array.isArray(report.photos) ? report.photos : [];
    const validPhotos = photoArray.filter((p: any) => p.filename || p.dataUrl);
    if (validPhotos.length > 0) {
      sectionHeader(`Daily Pictures (${validPhotos.length})`);
      validPhotos.forEach((photo: any, idx: number) => {
        const label = photo.filename || `Photo ${idx + 1}`;
        const desc = photo.caption ? `${label} — ${photo.caption}` : label;
        fieldRow(`Photo ${idx + 1}:`, desc);
      });
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
    const filename = `DFR-${report.date}-${report.project?.name?.replace(/\s+/g, "-").slice(0, 30) || "report"}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[DFR-PDF] Error generating PDF:", error?.message, error?.stack);
    return NextResponse.json(
      { error: "PDF generation failed", message: error?.message || "Unknown error", stack: error?.stack?.split("\n").slice(0, 5) },
      { status: 500 }
    );
  }
}
