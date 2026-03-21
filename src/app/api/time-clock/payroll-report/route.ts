import { NextResponse, NextRequest } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET – generate payroll report for a date range
export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const userRole = (session.user as any)?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const format = url.searchParams.get("format") || "json"; // json | csv

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    // Fetch all time entries in range with worker and project info
    const entries = await prisma.timeEntry.findMany({
      where: orgWhere(orgId, {
        date: { gte: startDate, lte: endDate },
        clockOut: { not: null }, // Only completed entries
      }),
      include: { worker: true, project: true },
      orderBy: [{ date: "asc" }, { clockIn: "asc" }],
    });

    // Group by worker
    const workerMap = new Map<string, {
      workerId: string;
      workerName: string;
      workerRole: string;
      totalHours: number;
      totalDays: Set<string>;
      entries: any[];
      projectBreakdown: Map<string, { projectName: string; hours: number; days: Set<string> }>;
    }>();

    for (const entry of entries) {
      const wId = entry.workerId;
      if (!workerMap.has(wId)) {
        workerMap.set(wId, {
          workerId: wId,
          workerName: entry.worker?.name || "Unknown",
          workerRole: entry.worker?.role || entry.worker?.position || "—",
          totalHours: 0,
          totalDays: new Set(),
          entries: [],
          projectBreakdown: new Map(),
        });
      }

      const w = workerMap.get(wId)!;
      const hrs = entry.hours || 0;
      w.totalHours += hrs;
      if (entry.date) w.totalDays.add(entry.date);
      w.entries.push(entry);

      // Project breakdown
      const projKey = entry.projectId || "__office__";
      const projName = entry.project?.name || "Office";
      if (!w.projectBreakdown.has(projKey)) {
        w.projectBreakdown.set(projKey, { projectName: projName, hours: 0, days: new Set() });
      }
      const pb = w.projectBreakdown.get(projKey)!;
      pb.hours += hrs;
      if (entry.date) pb.days.add(entry.date);
    }

    // Build report data
    const workers = Array.from(workerMap.values()).map((w) => ({
      workerId: w.workerId,
      workerName: w.workerName,
      workerRole: w.workerRole,
      totalHours: Math.round(w.totalHours * 100) / 100,
      daysWorked: w.totalDays.size,
      avgHoursPerDay: w.totalDays.size > 0 ? Math.round((w.totalHours / w.totalDays.size) * 100) / 100 : 0,
      projectBreakdown: Array.from(w.projectBreakdown.entries()).map(([id, pb]) => ({
        projectId: id === "__office__" ? null : id,
        projectName: pb.projectName,
        hours: Math.round(pb.hours * 100) / 100,
        daysWorked: pb.days.size,
      })),
      entries: w.entries.map((e: any) => ({
        id: e.id,
        date: e.date,
        clockIn: e.clockIn,
        clockOut: e.clockOut,
        hours: e.hours,
        notes: e.notes,
        projectName: e.project?.name || "Office",
      })),
    }));

    // Sort workers by name
    workers.sort((a, b) => a.workerName.localeCompare(b.workerName));

    const totalHours = Math.round(workers.reduce((s, w) => s + w.totalHours, 0) * 100) / 100;
    const totalWorkers = workers.length;

    // CSV format
    if (format === "csv") {
      const rows: string[] = [];
      rows.push("Employee Name,Role,Date,Project,Clock In,Clock Out,Hours,Notes");

      for (const w of workers) {
        for (const e of w.entries) {
          const clockIn = e.clockIn ? new Date(e.clockIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
          const clockOut = e.clockOut ? new Date(e.clockOut).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
          rows.push([
            `"${w.workerName}"`,
            `"${w.workerRole}"`,
            e.date,
            `"${e.projectName}"`,
            clockIn,
            clockOut,
            e.hours?.toFixed(2) || "0.00",
            `"${(e.notes || "").replace(/"/g, '""')}"`,
          ].join(","));
        }
      }

      // Summary rows
      rows.push("");
      rows.push("PAYROLL SUMMARY");
      rows.push(`Pay Period,${startDate} to ${endDate}`);
      rows.push(`Total Employees,${totalWorkers}`);
      rows.push(`Total Hours,${totalHours.toFixed(2)}`);
      rows.push("");
      rows.push("Employee,Role,Total Hours,Days Worked,Avg Hours/Day");
      for (const w of workers) {
        rows.push([
          `"${w.workerName}"`,
          `"${w.workerRole}"`,
          w.totalHours.toFixed(2),
          w.daysWorked,
          w.avgHoursPerDay.toFixed(2),
        ].join(","));
      }

      const csv = rows.join("\n");
      const filename = `payroll-report-${startDate}-to-${endDate}.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // JSON format
    const report = {
      startDate,
      endDate,
      totalHours,
      totalWorkers,
      totalEntries: entries.length,
      workers,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Payroll report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
