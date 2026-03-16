/**
 * Organization Data Export API
 *
 * GET /api/organizations/export
 *
 * Exports ALL organization data as a JSON file for compliance.
 * Supports the 30-year employee record retention requirement.
 * Only accessible by ADMIN users of the organization.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only administrators can export organization data" },
      { status: 403 }
    );
  }

  const orgId = user.organizationId;
  if (!orgId) {
    return NextResponse.json(
      { error: "No organization assigned" },
      { status: 403 }
    );
  }

  const orgFilter = { organizationId: orgId };

  // Export all org data in parallel
  const [
    organization,
    users,
    workers,
    projects,
    companies,
    contacts,
    leads,
    estimates,
    consultationEstimates,
    invoices,
    tasks,
    metrics,
    activities,
    calendarEvents,
    companyInfo,
    companyLicenses,
    knowledgeBase,
    bonusPeriods,
    incidents,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.user.findMany({
      where: orgFilter,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        // Exclude passwordHash for security
      },
    }),
    prisma.worker.findMany({
      where: orgFilter,
      include: {
        certifications: true,
        medicalRecords: true,
        respiratorFitTests: true,
        timeEntries: true,
        timeOffs: true,
      },
    }),
    prisma.project.findMany({
      where: orgFilter,
      include: {
        tasks: true,
        workers: true,
        complianceChecks: true,
        documents: true,
        dailyFieldReports: true,
        psiJhaSpas: true,
        preAbatementInspections: true,
        certificatesOfCompletion: true,
        postProjectInspections: true,
        budgetLines: true,
        incidents: true,
        contentInventory: { include: { photos: true } },
        contentInventoryReview: true,
        reviewRequests: true,
      },
    }),
    prisma.company.findMany({ where: orgFilter, include: { contacts: true } }),
    prisma.contact.findMany({ where: orgFilter }),
    prisma.lead.findMany({
      where: orgFilter,
      include: {
        estimates: { include: { followUps: true } },
        consultationEstimates: { include: { invoices: true } },
        documents: true,
        activities: true,
      },
    }),
    prisma.estimate.findMany({ where: orgFilter, include: { followUps: true } }),
    prisma.consultationEstimate.findMany({
      where: orgFilter,
      include: { invoices: true },
    }),
    prisma.invoice.findMany({ where: orgFilter }),
    prisma.task.findMany({ where: orgFilter }),
    prisma.metric.findMany({ where: orgFilter }),
    prisma.activity.findMany({ where: orgFilter }),
    prisma.calendarEvent.findMany({ where: orgFilter }),
    prisma.companyInfo.findMany({ where: orgFilter }),
    prisma.companyLicense.findMany({ where: orgFilter }),
    prisma.knowledgeBase.findMany({ where: orgFilter }),
    prisma.bonusPeriod.findMany({ where: orgFilter }),
    prisma.incident.findMany({ where: orgFilter }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    exportVersion: "1.0",
    organization,
    users,
    workers,
    projects,
    companies,
    contacts,
    leads,
    estimates,
    consultationEstimates,
    invoices,
    tasks,
    metrics,
    activities,
    calendarEvents,
    companyInfo,
    companyLicenses,
    knowledgeBase,
    bonusPeriods,
    incidents,
    recordCounts: {
      users: users.length,
      workers: workers.length,
      projects: projects.length,
      companies: companies.length,
      contacts: contacts.length,
      leads: leads.length,
      estimates: estimates.length,
      consultationEstimates: consultationEstimates.length,
      invoices: invoices.length,
      tasks: tasks.length,
    },
  };

  const json = JSON.stringify(exportData, null, 2);
  const orgSlug = organization?.slug || "export";
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `${orgSlug}-data-export-${dateStr}.json`;

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
