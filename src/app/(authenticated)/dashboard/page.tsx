import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org-context";
import { NextResponse } from "next/server";
import DashboardView from "./DashboardView";
import { Suspense } from "react";
import UpgradeBanner from "@/components/UpgradeBanner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await requireOrg();
  // If auth fails, requireOrg returns a redirect — but since this is a page component,
  // we handle the case where it's a NextResponse by falling back.
  const orgId = auth instanceof NextResponse ? null : auth.orgId;

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
    prisma.scheduleEntry.findMany({ include: { worker: true, project: true } }),
    prisma.document.findMany(),
    prisma.timeOff.findMany({ include: { worker: true } }),
  ]);

  // Fetch org's configured offices
  let offices: { value: string; label: string }[] = [];
  if (orgId) {
    try {
      const officeSetting = await prisma.setting.findUnique({
        where: { key: `offices_${orgId}` },
      });
      if (officeSetting?.value) {
        offices = JSON.parse(officeSetting.value);
      }
    } catch {}
  }

  return (
    <>
    <Suspense fallback={null}>
      <UpgradeBanner />
    </Suspense>
    <DashboardView
      projects={projects as any[]}
      workers={workers as any[]}
      alerts={alerts as any[]}
      certifications={certifications as any[]}
      leads={leads as any[]}
      tasks={tasks as any[]}
      incidents={incidents as any[]}
      timeEntries={timeEntries as any[]}
      scheduleEntries={scheduleEntries as any[]}
      documents={documents as any[]}
      timeOffs={timeOffs as any[]}
      offices={offices}
    />
    </>
  );
}
