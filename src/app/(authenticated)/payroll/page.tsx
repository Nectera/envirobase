import { redirect } from "next/navigation";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import PayrollHub from "./PayrollHub";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const result = await requireOrg();
  if (result instanceof Response) redirect("/login");
  const { session, orgId } = result;

  const role = (session?.user as any)?.role || "TECHNICIAN";
  if (role !== "ADMIN") redirect("/dashboard");

  // Fetch workers and current period data
  const workers = await prisma.worker.findMany({
    where: { ...orgWhere(orgId), status: "active" },
    orderBy: { name: "asc" },
  });

  // Get current pay period (biweekly, Mon-Sun)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const periodStart = new Date(now);
  periodStart.setDate(now.getDate() + mondayOffset - 7); // Last Monday
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodStart.getDate() + 13); // Two weeks

  const startStr = periodStart.toISOString().split("T")[0];
  const endStr = periodEnd.toISOString().split("T")[0];

  // Fetch time entries for current period
  const rawEntries = await prisma.timeEntry.findMany({
    where: {
      ...orgWhere(orgId),
      date: { gte: startStr, lte: endStr },
    },
    include: {
      worker: true,
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const timeEntries = rawEntries.map((e: any) => ({
    ...e,
    workerName: e.worker?.name || "Unknown",
  }));

  // Fetch all active clock-ins (no clockOut)
  const rawActiveClockIns = await prisma.timeEntry.findMany({
    where: { ...orgWhere(orgId), clockOut: null, clockIn: { not: null } },
    include: {
      worker: true,
      project: { select: { id: true, name: true } },
    },
  });
  const activeClockIns = rawActiveClockIns.map((e: any) => ({
    ...e,
    workerName: e.worker?.name || "Unknown",
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <PayrollHub
          workers={workers as any[]}
          timeEntries={timeEntries as any[]}
          activeClockIns={activeClockIns as any[]}
          periodStart={startStr}
          periodEnd={endStr}
          userId={(session?.user as any)?.id || ""}
        />
      </div>
    </div>
  );
}
