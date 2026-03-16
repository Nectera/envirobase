import { NextResponse, NextRequest } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { COMPANY_NAME } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
    }

    // Fetch completed entries in range
    const entries = await prisma.timeEntry.findMany({
      where: orgWhere(orgId, {
        date: { gte: startDate, lte: endDate },
        clockOut: { not: null },
      }),
      include: { worker: true, project: true },
      orderBy: [{ date: "asc" }, { clockIn: "asc" }],
    });

    // Group by worker
    const workerMap = new Map<string, {
      name: string;
      role: string;
      totalHours: number;
      days: Set<string>;
      projects: Map<string, { name: string; hours: number }>;
    }>();

    for (const entry of entries) {
      const wId = entry.workerId;
      if (!workerMap.has(wId)) {
        workerMap.set(wId, {
          name: entry.worker?.name || "Unknown",
          role: entry.worker?.role || entry.worker?.position || "—",
          totalHours: 0,
          days: new Set(),
          projects: new Map(),
        });
      }
      const w = workerMap.get(wId)!;
      const hrs = entry.hours || 0;
      w.totalHours += hrs;
      if (entry.date) w.days.add(entry.date);

      const projKey = entry.projectId || "__office__";
      const projName = entry.project?.name || "Office";
      if (!w.projects.has(projKey)) {
        w.projects.set(projKey, { name: projName, hours: 0 });
      }
      w.projects.get(projKey)!.hours += hrs;
    }

    const workers = Array.from(workerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const grandTotalHours = workers.reduce((s, w) => s + w.totalHours, 0);

    // Build PDF
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const green = rgb(0.31, 0.56, 0.15);
    const lineGray = rgb(0.85, 0.85, 0.85);
    const lightBg = rgb(0.96, 0.97, 0.98);

    let page = pdf.addPage([612, 792]);
    let y = 740;
    let pageNum = 1;

    const addNewPage = () => {
      page = pdf.addPage([612, 792]);
      y = 740;
      pageNum++;
      // Page header on continuation pages
      page.drawText(`${COMPANY_NAME} — Payroll Report (cont.)`, {
        x: 50, y: 760, font, size: 8, color: gray,
      });
      y = 740;
    };

    const checkPageBreak = (needed: number) => {
      if (y - needed < 60) addNewPage();
    };

    // ── Header ──
    page.drawText(COMPANY_NAME, { x: 50, y, font: fontBold, size: 16, color: green });
    y -= 16;
    page.drawText("903 5th St., Greeley, CO 80631", { x: 50, y, font, size: 8, color: gray });
    y -= 28;

    // ── Title ──
    page.drawText("Payroll Report", { x: 50, y, font: fontBold, size: 14, color: black });
    y -= 18;

    // Date range
    const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
    page.drawText(`Pay Period: ${fmtDate(startDate)} — ${fmtDate(endDate)}`, {
      x: 50, y, font, size: 10, color: black,
    });
    y -= 14;
    page.drawText(`Generated: ${new Date().toLocaleString("en-US")}`, { x: 50, y, font, size: 8, color: gray });
    y -= 24;

    // Separator
    page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: lineGray, thickness: 1 });
    y -= 16;

    // ── Summary stats ──
    page.drawText("Summary", { x: 50, y, font: fontBold, size: 11, color: black });
    y -= 16;
    page.drawText(`Total Employees: ${workers.length}`, { x: 50, y, font, size: 9, color: black });
    page.drawText(`Total Hours: ${grandTotalHours.toFixed(1)}`, { x: 200, y, font: fontBold, size: 9, color: green });
    page.drawText(`Total Entries: ${entries.length}`, { x: 370, y, font, size: 9, color: black });
    y -= 24;

    // ── Worker summary table ──
    page.drawLine({ start: { x: 50, y: y + 4 }, end: { x: 562, y: y + 4 }, color: lineGray, thickness: 1 });

    // Table headers
    const cols = [50, 200, 320, 395, 470];
    const headers = ["Employee", "Role", "Days Worked", "Total Hours", "Avg Hrs/Day"];
    headers.forEach((h, i) => {
      page.drawText(h, { x: cols[i], y, font: fontBold, size: 8, color: gray });
    });
    y -= 4;
    page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: lineGray, thickness: 0.5 });
    y -= 14;

    // Table rows
    for (let i = 0; i < workers.length; i++) {
      checkPageBreak(16);
      const w = workers[i];
      const avgHrs = w.days.size > 0 ? w.totalHours / w.days.size : 0;

      // Alternating row background
      if (i % 2 === 0) {
        page.drawRectangle({ x: 48, y: y - 3, width: 516, height: 16, color: lightBg });
      }

      page.drawText(w.name, { x: cols[0], y, font: fontBold, size: 9, color: black, maxWidth: 145 });
      page.drawText(w.role.substring(0, 25), { x: cols[1], y, font, size: 9, color: gray, maxWidth: 115 });
      page.drawText(String(w.days.size), { x: cols[2], y, font, size: 9, color: black });
      page.drawText(w.totalHours.toFixed(1) + "h", { x: cols[3], y, font: fontBold, size: 9, color: black });
      page.drawText(avgHrs.toFixed(1) + "h", { x: cols[4], y, font, size: 9, color: gray });
      y -= 16;
    }

    // Grand total row
    checkPageBreak(24);
    y -= 4;
    page.drawLine({ start: { x: 50, y: y + 4 }, end: { x: 562, y: y + 4 }, color: lineGray, thickness: 1 });
    y -= 4;
    page.drawText("TOTAL", { x: cols[0], y, font: fontBold, size: 10, color: black });
    page.drawText(grandTotalHours.toFixed(1) + "h", { x: cols[3], y, font: fontBold, size: 10, color: green });
    y -= 28;

    // ── Per-worker project breakdown ──
    checkPageBreak(30);
    page.drawText("Project Breakdown by Employee", { x: 50, y, font: fontBold, size: 11, color: black });
    y -= 18;

    for (const w of workers) {
      checkPageBreak(40);
      page.drawText(w.name, { x: 50, y, font: fontBold, size: 9, color: black });
      page.drawText(`(${w.totalHours.toFixed(1)}h total)`, { x: 50 + font.widthOfTextAtSize(w.name, 9) + 8, y, font, size: 8, color: gray });
      y -= 14;

      const projEntries = Array.from(w.projects.values());
      for (const proj of projEntries) {
        checkPageBreak(14);
        const pctOfWorker = w.totalHours > 0 ? ((proj.hours / w.totalHours) * 100).toFixed(0) : "0";
        page.drawText(`    ${proj.name}`, { x: 60, y, font, size: 8, color: black, maxWidth: 200 });
        page.drawText(`${proj.hours.toFixed(1)}h`, { x: 280, y, font, size: 8, color: black });
        page.drawText(`(${pctOfWorker}%)`, { x: 330, y, font, size: 8, color: gray });
        y -= 12;
      }
      y -= 6;
    }

    // ── Footer on each page ──
    const pages = pdf.getPages();
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      p.drawText(`Generated ${new Date().toLocaleString("en-US")} — Page ${i + 1} of ${pages.length}`, {
        x: 50, y: 30, font, size: 7, color: gray,
      });
      p.drawText(`${COMPANY_NAME} — Confidential`, {
        x: 350, y: 30, font, size: 7, color: gray,
      });
    }

    const pdfBytes = await pdf.save();
    const filename = `payroll-report-${startDate}-to-${endDate}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Payroll report PDF error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
