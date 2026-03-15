import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { TYPE_LABELS, COMPLIANCE_CHECKLISTS, REGULATIONS } from "@/lib/regulations";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Package } from "lucide-react";
import ProjectTabs from "./ProjectTabs";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
 try {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      tasks: { orderBy: { sortOrder: "asc" } },
      workers: { include: { worker: true } },
      alerts: { where: { dismissed: false } },
    },
  });

  if (!project) notFound();

  // Merge compliance checklists from all project types
  const projectTypes = (project.type || "").split(",").map((t: string) => t.trim()).filter(Boolean);
  const checklist = projectTypes.flatMap((t: string) => COMPLIANCE_CHECKLISTS[t] || []);
  const complianceChecks = await prisma.complianceCheck.findMany({
    where: { projectId: project.id },
  });

  const rawFieldReports = await prisma.dailyFieldReport.findMany({
    where: { projectId: project.id },
  });
  const fieldReports = rawFieldReports.map((r: any) => ({
    ...r,
    ...(r.data && typeof r.data === "object" ? r.data : {}),
  }));

  const timeEntries = await prisma.timeEntry.findMany({
    where: { projectId: project.id },
  });

  const rawPsiJhaSpas = await prisma.psiJhaSpa.findMany({
    where: { projectId: project.id },
  });
  const psiJhaSpas = rawPsiJhaSpas.map((r: any) => ({
    ...r,
    ...(r.data && typeof r.data === "object" ? r.data : {}),
  }));

  const preAbatementInspections = await prisma.preAbatementInspection.findMany({
    where: { projectId: project.id },
  });

  const certificatesOfCompletion = await prisma.certificateOfCompletion.findMany({
    where: { projectId: project.id },
  });

  const postProjectInspections = await prisma.postProjectInspection.findMany({
    where: { projectId: project.id },
  });

  const rawDocs = await prisma.document.findMany({
    where: { projectId: project.id },
  });
  // Flatten data JSON fields onto each doc for frontend compatibility
  const projectDocuments = rawDocs.map((d: any) => ({
    ...d,
    ...(d.data && typeof d.data === "object" ? d.data : {}),
  }));

  // Fetch PM-eligible workers (Project Manager + General Manager positions)
  const allWorkers = await prisma.worker.findMany();
  const pmEligibleWorkers = (allWorkers as any[]).filter(
    (w: any) => w.position === "Project Manager"
  );

  // Find Project Coordinator for Permit Mod tasks
  const projectCoordinator = (allWorkers as any[]).find(
    (w: any) => w.position === "Project Coordinator"
  );

  // Find Office Manager for post-cost tasks
  const officeManager = (allWorkers as any[]).find(
    (w: any) => w.position === "Office Manager"
  );

  // Find consultation estimate linked to this project (via lead or direct match)
  const allConsultationEstimates = await prisma.consultationEstimate.findMany();
  const relatedLeadsForEst: any[] = [];  // Lead model has no projectId FK
  const leadIdsForEst = relatedLeadsForEst.map((l: any) => l.id);
  const linkedConsultationEstimate = (allConsultationEstimates as any[]).find(
    (e: any) => e.projectId === project.id || e.projectNumber === project.projectNumber || (e.leadId && leadIdsForEst.includes(e.leadId))
  ) || null;

  // Fetch global tasks linked to this project
  const globalTasks = await prisma.task.findMany();
  const linkedTasks = (globalTasks as any[]).filter(
    (t: any) => t.linkedEntityType === "project" && t.linkedEntityId === project.id
  );
  const linkedTasksWithNames = linkedTasks.map((t: any) => {
    const worker = (allWorkers as any[]).find((w: any) => w.id === t.assignedTo);
    return { ...t, assigneeName: worker?.name || null };
  });

  // Fetch project incidents
  const incidents = await prisma.incident.findMany({
    where: { projectId: project.id },
  });

  // Fetch schedule entries for this project
  const scheduleEntries = await prisma.scheduleEntry.findMany({
    where: { projectId: project.id },
  });

  // Fetch invoices for this project
  const invoices = await prisma.invoice.findMany({
    where: { projectId: project.id },
  });

  // Fetch project activities
  const rawActivities = await prisma.activity.findMany({
    where: { parentType: "project", parentId: project.id },
    take: 30,
  });
  const activities = rawActivities.map((a: any) => ({ ...a, description: a.content || a.description || "" }));

  // Fetch linked activities from related leads
  const relatedLeads: any[] = [];  // Lead model has no projectId FK
  const leadIds = relatedLeads.map((l: any) => l.id);
  let linkedActivities: any[] = [];
  if (leadIds.length > 0) {
    const leadActivities = await prisma.activity.findMany({
      where: { parentId: { in: leadIds } },
      take: 20,
    });
    linkedActivities = leadActivities.map((a: any) => {
      const lead = relatedLeads.find((l: any) => l.id === a.parentId);
      return {
        ...a,
        description: a.content || a.description || "",
        _linkedFrom: lead ? [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Lead" : "Lead",
      };
    });
  }

  // Inventory item count
  const inventoryCount = await prisma.contentInventoryItem.count({
    where: { projectId: project.id },
  });

  return (
    <div>
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-4 transition">
        <ArrowLeft size={14} /> Back to Projects
      </Link>

      <div className="mb-3">
        {/* Mobile: compact header — name already contains type/client/address */}
        <div className="md:hidden">
          <h1 className="text-base font-bold text-slate-900 leading-tight mb-0.5">{project.name}</h1>
          <div className="flex flex-wrap gap-x-3 gap-y-0 text-[11px] text-slate-500">
            <span className="font-mono">{project.projectNumber}</span>
            <span>{formatDate(project.startDate)} — {formatDate(project.estEndDate)}</span>
            {project.permitNumber && <span>Permit: <span className="font-mono">{project.permitNumber}</span></span>}
            {inventoryCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <Package size={10} /> {inventoryCount} item{inventoryCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {(project.clientPhone || project.clientEmail) && (
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              {project.clientPhone && (
                <a href={`tel:${project.clientPhone}`} className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                  <Phone size={12} /> {project.clientPhone}
                </a>
              )}
              {project.clientEmail && (
                <a href={`mailto:${project.clientEmail}`} className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                  <Mail size={12} /> {project.clientEmail}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Desktop: clean header — name already has type/client/address baked in */}
        <div className="hidden md:block">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{project.name}</h1>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
              project.status === "completed" ? "bg-emerald-100 text-emerald-700" :
              project.status === "in_progress" ? "bg-blue-100 text-blue-700" :
              "bg-slate-100 text-slate-600"
            }`}>
              {project.status === "in_progress" ? "In Progress" : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-500">
            <span className="font-mono">{project.projectNumber}</span>
            <span>{formatDate(project.startDate)} — {formatDate(project.estEndDate)}</span>
            {project.permitNumber && <span>Permit: <span className="font-mono">{project.permitNumber}</span></span>}
            {project.clientPhone && (
              <a href={`tel:${project.clientPhone}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                <Phone size={11} /> {project.clientPhone}
              </a>
            )}
            {project.clientEmail && (
              <a href={`mailto:${project.clientEmail}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                <Mail size={11} /> {project.clientEmail}
              </a>
            )}
            {inventoryCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <Package size={11} /> {inventoryCount} item{inventoryCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <ProjectTabs
        project={project}
        checklist={checklist}
        complianceChecks={complianceChecks}
        fieldReports={fieldReports}
        timeEntries={timeEntries}
        psiJhaSpas={psiJhaSpas}
        preAbatementInspections={preAbatementInspections}
        certificatesOfCompletion={certificatesOfCompletion}
        postProjectInspections={postProjectInspections}
        projectDocuments={projectDocuments}
        activities={activities}
        linkedActivities={linkedActivities}
        pmEligibleWorkers={pmEligibleWorkers}
        linkedTasks={linkedTasksWithNames}
        projectCoordinatorId={projectCoordinator?.id || null}
        incidents={incidents}
        scheduleEntries={scheduleEntries}
        invoices={invoices}
        allWorkers={allWorkers}
        officeManagerId={officeManager?.id || null}
        linkedConsultationEstimate={linkedConsultationEstimate}
      />
    </div>
  );
 } catch (error: any) {
    console.error("Project detail page error:", error);
    return (
      <div className="p-8">
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-4 transition">
          <ArrowLeft size={14} /> Back to Projects
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <h2 className="text-red-800 font-semibold mb-2">Error loading project</h2>
          <pre className="text-red-600 text-sm whitespace-pre-wrap">{error.message || String(error)}</pre>
        </div>
      </div>
    );
  }
}
