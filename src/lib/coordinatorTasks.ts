import { prisma } from "@/lib/prisma";

/**
 * Create the 3 Project Coordinator tasks for a lead:
 *   1. Schedule Project
 *   2. Get Contracts Signed
 *   3. Obtain Necessary Permitting
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

  const tasksToCreate = [
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

  for (const taskData of tasksToCreate) {
    await prisma.task.create({
      data: {
        ...taskData,
        status: "to_do",
        dueDate: null,
        assignedTo: coordinatorId,
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
