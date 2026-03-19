import { prisma } from "@/lib/prisma";
import DashboardView from "./DashboardView";
import { Suspense } from "react";
import UpgradeBanner from "@/components/UpgradeBanner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    projects,
    workers,
    alerts,
    certifications,
    leads,
    tasks,
    incidents,
    timeEntries,
    scheduleEntries,
    documents,
    timeOffs,
  ] = await Promise.all([
    prisma.project.findMany({ include: { tasks: true } }),
    prisma.worker.findMany(),
    prisma.alert.findMany({ where: { dismissed: false }, orderBy: { date: "desc" }, take: 10 }),
    prisma.certification.findMany(),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.task.findMany(),
    prisma.incident.findMany(),
    prisma.timeEntry.findMany(),
    prisma.scheduleEntry.findMany(),
    prisma.document.findMany(),
    prisma.timeOff.findMany(),
  ]);

  // --- Project stats ---
  const activeProjects = projects.filter((p: any) => p.status === "in_progress" || p.status === "assessment");
  const completedProjects = projects.filter((p: any) => p.status === "completed");

  // --- Cert & compliance ---
  const certIssues = certifications.filter((c: any) => c.status === "expired" || c.status === "expiring_soon");
  const criticalAlerts = alerts.filter((a: any) => a.severity === "critical");

  // --- Tasks ---
  const openTasks = tasks.filter((t: any) => t.status !== "completed");
  const overdueTasks = openTasks.filter((t: any) => t.dueDate && t.dueDate < new Date().toISOString().split("T")[0]);
  const urgentTasks = openTasks.filter((t: any) => t.priority === "urgent" || t.priority === "high");

  // --- Lead pipeline ---
  const openLeads = leads.filter((l: any) => !["won", "lost"].includes(l.status));
  const wonLeads = leads.filter((l: any) => l.status === "won");
  const pipelineValue = openLeads.reduce((sum: number, l: any) => sum + (l.estimatedValue || 0), 0);

  // --- Incidents ---
  const openIncidents = incidents.filter((i: any) => i.status === "open");

  // --- Time / labor this week ---
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const mondayStr = monday.toISOString().split("T")[0];
  const weekEntries = timeEntries.filter((e: any) => e.date >= mondayStr);
  const weekHours = weekEntries.reduce((sum: number, e: any) => sum + (e.totalHours || 0), 0);
  const uniqueWorkersThisWeek = new Set(weekEntries.map((e: any) => e.workerId)).size;

  // --- Permit warnings ---
  const todayStr = today.toISOString().split("T")[0];
  const expiringPermits = documents.filter((d: any) => {
    if (d.docType !== "state_permit" || !d.endDate) return false;
    const daysLeft = Math.ceil((new Date(d.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 14 && daysLeft >= 0;
  });
  const expiredPermits = documents.filter((d: any) => d.docType === "state_permit" && d.endDate && d.endDate < todayStr);

  // --- Workers scheduled today ---
  const todaySchedule = scheduleEntries.filter((e: any) => e.date === todayStr);

  // --- This week's schedule entries ---
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + (7 - dayOfWeek));
  const sundayStr = sunday.toISOString().split("T")[0];
  const weekSchedule = scheduleEntries.filter((e: any) => e.date >= mondayStr && e.date <= sundayStr);

  // --- Upcoming PTO (ending today or later, sorted by start date) ---
  const upcomingTimeOffs = timeOffs
    .filter((t: any) => t.endDate >= todayStr)
    .sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));

  // --- Field workers with skill ratings ---
  const fieldPositions = ["Technician", "Supervisor", "Laborer"];
  const fieldWorkers = workers.filter((w: any) => fieldPositions.includes(w.position));

  return (
    <>
    <Suspense fallback={null}>
      <UpgradeBanner />
    </Suspense>
    <DashboardView
      projects={projects}
      activeProjects={activeProjects}
      completedProjects={completedProjects}
      workers={workers}
      fieldWorkers={fieldWorkers}
      alerts={alerts}
      criticalAlerts={criticalAlerts}
      certIssues={certIssues}
      openTasks={openTasks}
      overdueTasks={overdueTasks}
      urgentTasks={urgentTasks}
      openLeads={openLeads}
      wonLeads={wonLeads}
      pipelineValue={pipelineValue}
      openIncidents={openIncidents}
      weekHours={weekHours}
      uniqueWorkersThisWeek={uniqueWorkersThisWeek}
      todaySchedule={todaySchedule}
      expiringPermits={expiringPermits}
      expiredPermits={expiredPermits}
      tasks={tasks}
      weekSchedule={weekSchedule}
      upcomingTimeOffs={upcomingTimeOffs}
    />
    </>
  );
}
