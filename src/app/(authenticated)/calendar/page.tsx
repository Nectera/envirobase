import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CalendarView from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role || "TECHNICIAN";
  const userId = (session?.user as any)?.id;

  // Fetch a wide date range (3 months back, 3 months forward)
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split("T")[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString().split("T")[0];

  // Fetch all data in parallel
  const [scheduleEntries, timeOffEntries, calendarEvents, workers, projects] = await Promise.all([
    prisma.scheduleEntry.findMany({ include: { worker: true, project: true } }),
    prisma.timeOff.findMany({ where: { dateRange: { start: startDate, end: endDate } }, include: { worker: true } }),
    prisma.calendarEvent.findMany({ where: { dateRange: { start: startDate, end: endDate } } }),
    prisma.worker.findMany(),
    prisma.project.findMany({ include: { workers: { include: { worker: true } } } }),
  ]);

  // Filter schedule entries to the date range
  const filteredSchedule = (scheduleEntries as any[]).filter(
    (e: any) => e.date >= startDate && e.date <= endDate
  );

  // Aggregate schedule entries into project-level data per date
  // Instead of showing "Worker A on Project X", show "Project X (3 workers)" per day
  const projectScheduleMap: Record<string, Record<string, { project: any; workers: any[]; entries: any[] }>> = {};

  for (const entry of filteredSchedule) {
    const date = entry.date;
    const projectId = entry.projectId;
    if (!projectScheduleMap[date]) projectScheduleMap[date] = {};
    if (!projectScheduleMap[date][projectId]) {
      projectScheduleMap[date][projectId] = {
        project: entry.project,
        workers: [],
        entries: [],
      };
    }
    if (entry.worker && !projectScheduleMap[date][projectId].workers.find((w: any) => w.id === entry.worker?.id)) {
      projectScheduleMap[date][projectId].workers.push(entry.worker);
    }
    projectScheduleMap[date][projectId].entries.push(entry);
  }

  // Also show active projects on their weekday date range so the calendar reflects project timelines.
  // Weekend days only appear if an explicit ScheduleEntry exists for that date.
  const activeProjects = (projects as any[]).filter(
    (p: any) => p.startDate && p.status !== "completed" && p.status !== "cancelled"
  );
  for (const project of activeProjects) {
    const projStart = project.startDate > startDate ? project.startDate : startDate;
    const projEnd = project.estEndDate
      ? (project.estEndDate < endDate ? project.estEndDate : endDate)
      : project.startDate;
    const cursor = new Date(projStart + "T12:00:00");
    const endCursor = new Date(projEnd + "T12:00:00");
    while (cursor <= endCursor) {
      const dayOfWeek = cursor.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = cursor.toISOString().split("T")[0];
      if (!isWeekend) {
        if (!projectScheduleMap[dateStr]) projectScheduleMap[dateStr] = {};
        if (!projectScheduleMap[dateStr][project.id]) {
          const projectWorkers = (project.workers || []).map((pw: any) => pw.worker).filter(Boolean);
          projectScheduleMap[dateStr][project.id] = {
            project,
            workers: projectWorkers,
            entries: [],
          };
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return (
    <CalendarView
      projectScheduleMap={projectScheduleMap}
      timeOffEntries={timeOffEntries as any[]}
      calendarEvents={calendarEvents as any[]}
      workers={workers as any[]}
      projects={projects as any[]}
      userRole={userRole}
      userId={userId}
    />
  );
}
