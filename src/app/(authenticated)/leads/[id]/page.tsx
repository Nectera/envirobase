import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import LeadDetail from "./LeadDetail";

export const dynamic = "force-dynamic";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { company: true, contact: true, estimates: true },
    });

    if (!lead) notFound();

    const rawActivities = await prisma.activity.findMany({
      where: { parentType: "lead", parentId: id },
      take: 50,
    });
    const activities = rawActivities.map((a: any) => ({
      ...a,
      description: a.content || a.description || "",
    }));

    // Fetch linked activities from company and contact
    const linkedIds: string[] = [];
    if (lead.companyId) linkedIds.push(lead.companyId);
    if (lead.contactId) linkedIds.push(lead.contactId);
    let linkedActivities: any[] = [];
    if (linkedIds.length > 0) {
      const allLinked = await prisma.activity.findMany({
        where: { parentId: { in: linkedIds } },
        take: 30,
      });
      linkedActivities = allLinked.map((a: any) => ({
        ...a,
        description: a.content || a.description || "",
        _linkedFrom: a.parentId === lead.companyId
          ? lead.company?.name || "Company"
          : lead.contact?.name || "Contact",
      }));
    }

    const companies = await prisma.company.findMany();
    const contacts = await prisma.contact.findMany({
      where: lead.companyId ? { companyId: lead.companyId } : {},
    });

    // Fetch active workers for site visit assignment and task assignee resolution
    const allWorkers = await prisma.worker.findMany({ where: { status: "active" } });
    const fieldEstimators = (allWorkers as any[]).map((w: any) => ({ id: w.id, name: w.name, position: w.position, office: w.office }));
    const workerMap = new Map((allWorkers as any[]).map((w: any) => [w.id, w.name]));

    // Fetch linked tasks for this lead and resolve assignee names
    const rawLinkedTasks = await prisma.task.findMany({
      where: { linkedEntityType: "lead", linkedEntityId: id },
    });
    const linkedTasks = rawLinkedTasks.map((t: any) => ({
      ...t,
      assigneeName: t.assignedTo ? workerMap.get(t.assignedTo) || null : null,
    }));

    // Fetch consultation estimates for this lead
    const consultationEstimates = await prisma.consultationEstimate.findMany({
      where: { leadId: id } as any,
    });

    // Fetch linked project clearance data (if lead has been won)
    let linkedProjectClearance: any = null;
    if (lead.projectId) {
      const proj = await prisma.project.findUnique({
        where: { id: lead.projectId },
        select: {
          clearanceResult: true,
          clearanceDate: true,
          clearanceCost: true,
          clearanceVendor: true,
          clearanceNotes: true,
          clearanceReportUrl: true,
          clearanceReportName: true,
          clearanceInvoiceUrl: true,
          clearanceInvoiceName: true,
        },
      });
      if (proj && proj.clearanceResult) linkedProjectClearance = proj;
    }

    // Fetch lead documents and flatten data JSON
    const rawLeadDocs = await prisma.leadDocument.findMany({
      where: { leadId: id },
    });
    const leadDocuments = rawLeadDocs.map((d: any) => ({
      ...d,
      ...(d.data && typeof d.data === "object" ? d.data : {}),
    }));

    return <LeadDetail lead={lead} activities={activities} linkedActivities={linkedActivities} companies={companies} contacts={contacts} linkedTasks={linkedTasks} consultationEstimates={consultationEstimates} leadDocuments={leadDocuments} fieldEstimators={fieldEstimators} linkedProjectClearance={linkedProjectClearance} />;
  } catch (error: any) {
    console.error("Lead page error:", error?.message, error?.code, error?.meta);
    throw error;
  }
}
