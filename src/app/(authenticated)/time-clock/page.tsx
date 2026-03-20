import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Clock, Users, DollarSign } from "lucide-react";
import TimeClockPanel from "./TimeClockPanel";
import { getTranslation, type Language } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function TimeClockPage() {
  const language: Language = "en";
  const t = (key: string) => getTranslation(language, key);

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role; // ADMIN, SUPERVISOR, WORKER

  // Get all non-completed projects
  const allProjects = await prisma.project.findMany();
  const projects = allProjects.filter(
    (p: any) => p.status !== "completed" && p.status !== "cancelled"
  );
  const workers = await prisma.worker.findMany();

  // Find the current user's worker profile
  const currentWorker = userId
    ? workers.find((w: any) => w.userId === userId) || null
    : null;

  // Determine clock role from user profile
  const isSupOrAdmin = userRole === "ADMIN" || userRole === "SUPERVISOR";
  const clockRole = isSupOrAdmin ? "supervisor" : "technician";

  // Get today's date and start of week (Monday)
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekStart = monday.toISOString().split("T")[0];

  // Get all open (active) clock-ins
  const activeEntries = await prisma.timeEntry.findMany({
    where: { clockOut: null },
    include: { project: true, worker: true },
  });

  // Get today's entries
  const todayEntries = await prisma.timeEntry.findMany({
    where: { date: today },
    include: { project: true, worker: true },
  });

  // Get this week's entries (Monday through today)
  const weekEntries = await prisma.timeEntry.findMany({
    where: { date: { gte: weekStart, lte: today } },
    include: { project: true, worker: true },
    orderBy: { date: "desc" },
  });

  // For technicians, filter entries to only their own
  const isTech = userRole === "TECHNICIAN";
  const filteredActiveEntries = isTech && currentWorker
    ? activeEntries.filter((e: any) => e.workerId === currentWorker.id)
    : activeEntries;
  const filteredTodayEntries = isTech && currentWorker
    ? todayEntries.filter((e: any) => e.workerId === currentWorker.id)
    : todayEntries;
  const filteredWeekEntries = isTech && currentWorker
    ? weekEntries.filter((e: any) => e.workerId === currentWorker.id)
    : weekEntries;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("timeClock.title")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isTech ? t("timeClock.subtitle") : t("timeClock.adminSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isTech && (
            <Link
              href="/time-clock/payroll"
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
            >
              <DollarSign size={14} /> Payroll Report
            </Link>
          )}
          <div className="text-right text-sm">
            <div className="text-slate-500">{t("timeClock.today")}</div>
            <div className="font-semibold text-slate-800">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
          </div>
        </div>
      </div>

      {/* Active clock-ins summary — admin/supervisor only */}
      {!isTech && activeEntries.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">{activeEntries.length} {t("timeClock.currentlyClockedIn")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeEntries.map((entry: any) => (
              <span key={entry.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-200 rounded-full text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-slate-800">{entry.workerName}</span>
                <span className="text-slate-400">·</span>
                <span className={`font-medium ${entry.role === "supervisor" ? "text-indigo-600" : "text-slate-600"}`}>
                  {entry.role === "supervisor" ? "Supervisor" : "Technician"}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{entry.project?.name || "—"}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <TimeClockPanel
        projects={projects}
        workers={isTech && currentWorker ? [currentWorker] : workers}
        todayEntries={filteredTodayEntries}
        weekEntries={filteredWeekEntries}
        activeEntries={filteredActiveEntries}
        currentWorker={currentWorker}
        currentUserRole={clockRole}
        isAdmin={!isTech}
      />
    </div>
  );
}
