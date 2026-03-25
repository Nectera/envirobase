import { prisma } from "@/lib/prisma";

/**
 * Create the Project Coordinator tasks for a lead when it's won.
 * First checks DB for enabled "coordinator" category rules.
 * Falls back to hardcoded defaults if no DB rules exist.
 *
 * Called when a lead is marked "won" or when a consultation estimate is approved.
 * Includes a duplicate check — won't create if PC tasks already exist for this lead.
 */
export async function createCoordinatorTasks(lead: any, projectId?: string) {
  // Duplicate check: skip if coordinator tasks already exist for this lead or project
  const existingTasks = await prisma.task.findMany({
    where: {
      OR: [
        { linkedEntityType: "lead", linkedEntityId: lead.id },
        ...(projectId ? [{ linkedEntityType: "project", linkedEntityId: projectId }] : []),
      ],
    },
  });
  const alreadyHasPCTasks = (existingTasks as any[]).some(
    (t: any) =>
      t.title?.startsWith("Schedule Project") ||
      t.title?.startsWith("Get Contracts Signed") ||
      t.title?.startsWith("Obtain Necessary Permitting")
  );
  if (alreadyHasPCTasks) return;

  const leadName =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown";
  const address = lead.address || "";
  const companyName = lead.company?.name || "";

  // Check DB for coordinator rules
  const dbRules = await prisma.taskAutomationRule.findMany({
    where: {
      category: "coordinator",
      trigger: "lead_status_change",
      triggerValue: "won",
      enabled: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Find a Project Coordinator worker (prefer office match)
  const allWorkers = await prisma.worker.findMany();
  const coordinators = (allWorkers as any[]).filter(
    (w: any) =>
      (w.position || "").toLowerCase().includes("project coordinator") ||
      (w.role || "").toLowerCase().includes("project_coordinator")
  );
  const leadOffice = lead.office;
  const coordinator =
    coordinators.find((c: any) => c.office === leadOffice) ||
    coordinators[0] ||
    null;
  const coordinatorId = coordinator?.id || null;

  // Template variable replacement
  const vars: Record<string, string> = {
    leadName,
    address,
    companyName,
    phone: lead.phone || "",
    email: lead.email || "",
    projectType: lead.projectType || "",
    office: lead.office || "",
  };

  function interpolate(template: string): string {
    if (!template) return "";
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
  }

  let tasksToCreate: { title: string; description: string; priority: string }[];

  if (dbRules.length > 0) {
    // Use DB rules
    tasksToCreate = dbRules.map((rule: any) => ({
      title: interpolate(rule.taskTitle || rule.name || ""),
      description: interpolate(rule.taskDescription || ""),
      priority: rule.taskPriority || "high",
    }));
  } else {
    // Fallback to hardcoded defaults
    tasksToCreate = [
      {
        title: `Schedule Project - ${leadName}`,
        description: `Schedule the project for ${leadName}.\n\nAddress: ${address}\nCompany: ${companyName}`,
        priority: "high",
      },
      {
        title: `Get Contracts Signed - ${leadName}`,
        description: `Obtain signed contracts for ${leadName}.\n\nAddress: ${address}\nCompany: ${companyName}`,
        priority: "high",
      },
      {
        title: `Obtain Necessary Permitting - ${leadName}`,
        description: `Secure all required permits for ${leadName}.\n\nAddress: ${address}\nProject Type: ${lead.projectType || ""}\nCompany: ${companyName}`,
        priority: "high",
      },
    ];
  }

  for (const taskData of tasksToCreate) {
    // Resolve assignee from DB rule if present
    let assigneeId = coordinatorId;
    const matchingRule = dbRules.find((r: any) =>
      interpolate(r.taskTitle || r.name || "") === taskData.title
    );
    if (matchingRule) {
      const resolved = await resolveAssignee(matchingRule, lead, allWorkers as any[]);
      if (resolved) assigneeId = resolved;
    }

    await prisma.task.create({
      data: {
        ...taskData,
        status: "to_do",
        dueDate: null,
        assignedTo: assigneeId,
        createdBy: "system",
        linkedEntityType: projectId ? "project" : "lead",
        linkedEntityId: projectId || lead.id,
        autoCreated: true,
        completedAt: null,
      },
    });
  }

  // Log activity
  await prisma.activity.create({
    data: {
      parentType: "lead",
      parentId: lead.id,
      leadId: lead.id,
      type: "coordinator_tasks_created",
      content: `Tasks created for scheduling, contracts, and permitting.`,
      user: "system",
    },
  });
}

async function resolveAssignee(rule: any, lead: any, allWorkers: any[]): Promise<string | null> {
  switch (rule.assignToField) {
    case "lead_assignee":
      return lead.assignedTo || null;
    case "worker_role":
      if (rule.assignToValue) {
        const target = rule.assignToValue.toLowerCase().replace(/_/g, " ");
        if (lead.office) {
          const officeMatch = allWorkers.find(
            (w: any) => w.role && w.role.toLowerCase().includes(target) && w.office === lead.office
          );
          if (officeMatch) return officeMatch.id;
        }
        const match = allWorkers.find(
          (w: any) => w.role && (w.role.toLowerCase().includes(target) || w.role.toLowerCase().includes(rule.assignToValue.toLowerCase()))
        );
        if (match) return match.id;
      }
      return null;
    case "specific_worker":
      return rule.assignToValue || null;
    default:
      return null;
  }
}
