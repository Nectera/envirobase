import { NextResponse, NextRequest } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { COMPANY_NAME } from "@/lib/branding";

export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const date = url.searchParams.get("date");

    if (!projectId || !date) {
      return NextResponse.json({ error: "projectId and date required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: orgWhere(orgId, { id: projectId }) });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const entries = await prisma.timeEntry.findMany({
      where: orgWhere(orgId, { projectId, date }),
    });

    // Build PDF
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([612, 792]); // Letter size

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const indigo = rgb(0.31, 0.27, 0.9);
    const lineGray = rgb(0.85, 0.85, 0.85);

    let y = 740;

    // Header
    page.drawText(COMPANY_NAME, { x: 50, y, font: fontBold, size: 16, color: indigo });
    y -= 16;
    page.drawText("903 5th St., Greeley, CO 80631", { x: 50, y, font, size: 8, color: gray });
    y -= 28;

    // Title
    page.drawText("Daily Time Report", { x: 50, y, font: fontBold, size: 14, color: black });
    y -= 18;

    // Project info
    const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    page.drawText(`Project: ${project.name}`, { x: 50, y, font: fontBold, size: 10, color: black });
    y -= 14;
    page.drawText(`Date: ${formattedDate}`, { x: 50, y, font, size: 10, color: black });
    y -= 14;
    page.drawText(`Address: ${project.address || "—"}`, { x: 50, y, font, size: 10, color: gray });
    y -= 24;

    // Separator
    page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: lineGray, thickness: 1 });
    y -= 16;

    // Table header
    const cols = [50, 180, 270, 330, 390, 440, 490];
    const headers = ["Worker", "Role", "Clock In", "Clock Out", "Break", "Hours", "Notes"];
    headers.forEach((h, i) => {
      page.drawText(h, { x: cols[i], y, font: fontBold, size: 8, color: gray });
    });
    y -= 4;
    page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: lineGray, thickness: 0.5 });
    y -= 14;

    // Entries
    const supervisorEntries = entries.filter((e: any) => e.role === "supervisor");
    const technicianEntries = entries.filter((e: any) => e.role === "technician");
    const allSorted = [...supervisorEntries, ...technicianEntries];

    for (const entry of allSorted) {
      if (y < 80) break; // don't overflow

      const clockInTime = new Date(entry.clockIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      const clockOutTime = entry.clockOut
        ? new Date(entry.clockOut).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        : "Active";
      const totalHrs = entry.totalHours != null ? `${entry.totalHours.toFixed(1)}h` : "—";
      const roleLabel = entry.role === "supervisor" ? "Supervisor" : "Technician";

      page.drawText(entry.workerName || "—", { x: cols[0], y, font, size: 9, color: black, maxWidth: 125 });
      page.drawText(roleLabel, { x: cols[1], y, font, size: 9, color: entry.role === "supervisor" ? indigo : gray });
      page.drawText(clockInTime, { x: cols[2], y, font, size: 9, color: black });
      page.drawText(clockOutTime, { x: cols[3], y, font, size: 9, color: entry.clockOut ? black : rgb(0.1, 0.6, 0.3) });
      page.drawText(entry.breakMinutes > 0 ? `${entry.breakMinutes}m` : "—", { x: cols[4], y, font, size: 9, color: gray });
      page.drawText(totalHrs, { x: cols[5], y, font: fontBold, size: 9, color: black });

      const noteText = (entry.notes || "—").substring(0, 30);
      page.drawText(noteText, { x: cols[6], y, font, size: 8, color: gray, maxWidth: 70 });

      y -= 16;
    }

    // Totals
    y -= 8;
    page.drawLine({ start: { x: 50, y: y + 4 }, end: { x: 562, y: y + 4 }, color: lineGray, thickness: 1 });

    const supHrs = entries.filter((e: any) => e.role === "supervisor").reduce((s: number, e: any) => s + (e.totalHours || 0), 0);
    const techHrs = entries.filter((e: any) => e.role === "technician").reduce((s: number, e: any) => s + (e.totalHours || 0), 0);
    const totalHrs = supHrs + techHrs;

    y -= 8;
    page.drawText("Summary", { x: 50, y, font: fontBold, size: 10, color: black });
    y -= 16;
    page.drawText(`Headcount: ${entries.length}`, { x: 50, y, font, size: 9, color: black });
    page.drawText(`Supervisors: ${supervisorEntries.length}`, { x: 180, y, font, size: 9, color: black });
    page.drawText(`Technicians: ${technicianEntries.length}`, { x: 310, y, font, size: 9, color: black });
    y -= 14;
    page.drawText(`Supervisor Hours: ${supHrs.toFixed(1)}`, { x: 50, y, font: fontBold, size: 9, color: indigo });
    page.drawText(`Technician Hours: ${techHrs.toFixed(1)}`, { x: 200, y, font: fontBold, size: 9, color: black });
    page.drawText(`Total Hours: ${totalHrs.toFixed(1)}`, { x: 370, y, font: fontBold, size: 11, color: black });

    // Footer
    page.drawText(`Generated ${new Date().toLocaleString("en-US")}`, {
      x: 50, y: 30, font, size: 7, color: gray,
    });
    page.drawText(`${COMPANY_NAME} — Confidential`, {
      x: 350, y: 30, font, size: 7, color: gray,
    });

    const pdfBytes = await pdf.save();
    const filename = `time-report-${project.name.replace(/\s+/g, "-").toLowerCase()}-${date}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
