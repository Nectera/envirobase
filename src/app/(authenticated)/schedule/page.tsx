import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isTechnician, getWorkerForUser } from "@/lib/roles";
import ScheduleCalendarView from "./ScheduleCalendarView";
import TechnicianScheduleView from "./TechnicianScheduleView";
import { getTranslation, type Language } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const language: Language = "en";
  const t = (key: string) => getTranslation(language, key);

  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  // Technician view: show only their schedule
  if (isTechnician(userRole) && userId) {
    const worker = await getWorkerForUser(userId);

    if (!worker) {
      return (
        <div>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">{t("schedule.mySchedule")}</h1>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-amber-800">{t("schedule.noProfile")}</p>
          </div>
        </div>
      );
    }

    // Load entries for this worker (wide window)
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split("T")[0];

    const entries = await prisma.scheduleEntry.findMany({
      where: { workerId: worker.id, dateRange: { start: startDate, end: endDate } },
      include: { project: true },
    });

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">{t("schedule.mySchedule")}</h1>
          <p className="text-sm text-slate-500">{worker.name} — {worker.role}</p>
        </div>
        <TechnicianScheduleView
          workerName={worker.name}
          entries={entries}
        />
      </div>
    );
  }

  // Admin/Supervisor view: full schedule
  const projects = await prisma.project.findMany();
  const allWorkers = await prisma.worker.findMany({
    include: { certifications: true },
  });
  // Only field workers can be scheduled on projects
  const schedulablePositions = ["Technician", "Supervisor"];
  const workers = (allWorkers as any[]).filter(
    (w: any) => schedulablePositions.includes(w.position)
  );

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split("T")[0];

  const entries = await prisma.scheduleEntry.findMany({
    where: { dateRange: { start: startDate, end: endDate } },
    include: { worker: true, project: true },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{t("schedule.title")}</h1>
        <p className="text-sm text-slate-500">{t("schedule.subtitle")}</p>
      </div>
      <ScheduleCalendarView
        projects={projects.filter((p: any) => p.status !== "completed" && p.status !== "cancelled")}
        workers={workers}
        initialEntries={entries}
      />
    </div>
  );
}
