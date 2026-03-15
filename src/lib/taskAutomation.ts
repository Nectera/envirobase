import { prisma } from "./prisma";

/**
 * Build template variables from a lead record.
 */
function buildLeadVars(lead: any): Record<string, string> {
  const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown";
  const companyName = lead.company?.name || "";
  const stateZip = [lead.state, lead.zip].filter(Boolean).join(" ");
  const addressParts = [lead.address, lead.city, stateZip].filter(Boolean);
  return {
    leadName,
    companyName,
    address: addressParts.join(", "),
    phone: lead.phone || "",
    email: lead.email || "",
    notes: lead.notes || "",
    siteVisitDate: lead.siteVisitDate || "",
    siteVisitTime: lead.siteVisitTime || "",
    siteVisitNotes: lead.siteVisitNotes || "",
    projectType: lead.projectType || "",
    office: lead.office || "",
  };
}

/**
 * Resolve assignee from automation rule settings.
 * Prefers office-specific matches when lead has an office.
 */
async function resolveAssignee(rule: any, lead: any): Promise<string | null> {
  switch (rule.assignToField) {
    case "lead_assignee":
      return lead.assignedTo || null;

    case "worker_role":
      if (rule.assignToValue) {
        const workers = await prisma.worker.findMany();
        const allWorkers = workers as any[];
        const target = rule.assignToValue.toLowerCase().replace(/_/g, " ");

        // Try office-specific match first
        if (lead.office) {
          const officeMatch = allWorkers.find(
            (w: any) =>
              w.role &&
              w.role.toLowerCase().includes(target) &&
              w.office === lead.office
          );
          if (officeMatch) return officeMatch.id;
        }

        // Fallback to any matching role
        const match = allWorkers.find(
          (w: any) =>
            w.role &&
            (w.role.toLowerCase().includes(target) ||
              w.role.toLowerCase().includes(rule.assignToValue.toLowerCase()))
        );
        if (match) return match.id;
      }
      return null;

    case "specific_worker":
      return rule.assignToValue || null;

    case "none":
    default:
      return null;
  }
}

/**
 * Run all enabled automation rules that match a lead status change.
 * Called from the leads PUT API whenever status changes.
 */
export async function runLeadStatusAutomations(
  lead: any,
  oldStatus: string,
  newStatus: string,
  userId: string,
  options?: { siteVisitAssignee?: string | null }
) {
  const rules = await prisma.taskAutomationRule.findMany({
    where: {
      trigger: "lead_status_change",
      triggerValue: newStatus,
      enabled: true,
    },
  });

  const vars = buildLeadVars(lead);

  console.log("taskAutomation: rules found:", rules.length, "newStatus:", newStatus, "siteVisitAssignee:", options?.siteVisitAssignee);

  // If rules exist, use them
  if (rules && rules.length > 0) {
    for (const rule of rules) {
      const title = interpolate(rule.taskTitle, vars);
      const description = interpolate(rule.taskDescription, vars);
      // Use explicitly selected assignee for site visit, otherwise resolve from rule
      const assignedTo = (newStatus === "site_visit" && options?.siteVisitAssignee)
        ? options.siteVisitAssignee
        : await resolveAssignee(rule, lead);
      console.log("taskAutomation: creating task with assignedTo:", assignedTo);

      // Calculate due date: use offset days if set, else site visit date for site visits
      let dueDate: string | null = null;
      if (rule.dueDateOffsetDays) {
        const d = new Date();
        d.setDate(d.getDate() + rule.dueDateOffsetDays);
        dueDate = d.toISOString().split("T")[0];
      } else if (lead.siteVisitDate && newStatus === "site_visit") {
        dueDate = lead.siteVisitDate;
      }

      await prisma.task.create({
        data: {
          title,
          description,
          status: "to_do",
          priority: rule.taskPriority || "medium",
          dueDate,
          assignedTo,
          createdBy: userId || "system",
          linkedEntityType: rule.linkedEntity ? "lead" : null,
          linkedEntityId: rule.linkedEntity ? lead.id : null,
          autoCreated: true,
        },
      });
    }
  } else if (newStatus === "site_visit") {
    // Default site visit task when no rules configured
    const leadName = vars.leadName;
    const address = vars.address;
    const siteDate = lead.siteVisitDate || "";
    const siteTime = lead.siteVisitTime || "";
    const siteNotes = lead.siteVisitNotes || "";

    // Build date/time string
    const scheduledParts = [siteDate, siteTime].filter(Boolean).join(" at ");

    // Find a Field Estimator worker (prefer office match, then any estimator, then lead assignee)
    const allWorkers = await prisma.worker.findMany();
    const estimators = (allWorkers as any[]).filter(
      (w: any) =>
        w.status === "active" && (
          (w.position || "").toLowerCase().includes("field estimator") ||
          (w.position || "").toLowerCase().includes("estimator") ||
          (w.role || "").toLowerCase().includes("field_estimator") ||
          (w.role || "").toLowerCase().includes("estimator")
        )
    );
    const estimator =
      estimators.find((e: any) => e.office === lead.office) ||
      estimators[0] ||
      null;
    // Use explicitly selected assignee, then estimator lookup, then lead assignee
    const assigneeId = options?.siteVisitAssignee || estimator?.id || lead.assignedTo || null;
    console.log("taskAutomation fallback: assigneeId:", assigneeId, "from options:", options?.siteVisitAssignee, "estimator:", estimator?.id, "lead.assignedTo:", lead.assignedTo);

    await prisma.task.create({
      data: {
        title: `Site Visit - ${leadName}`,
        description: [
          `Customer: ${leadName}`,
          address ? `Address: ${address}` : "",
          scheduledParts ? `Scheduled: ${scheduledParts}` : "",
          lead.phone ? `Phone: ${lead.phone}` : "",
          lead.projectType ? `Project Type: ${lead.projectType}` : "",
          siteNotes ? `Notes: ${siteNotes}` : "",
        ].filter(Boolean).join("\n"),
        status: "to_do",
        priority: "high",
        dueDate: lead.siteVisitDate || null,
        assignedTo: assigneeId,
        createdBy: userId || "system",
        linkedEntityType: "lead",
        linkedEntityId: lead.id,
        autoCreated: true,
      },
    });
  } else if (newStatus === "proposal_sent") {
    // Default: Estimate follow-up task for desk estimator, due in 3 days
    const leadName = vars.leadName;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split("T")[0];

    // Find a Desk Estimator worker (prefer office match)
    const allWorkers = await prisma.worker.findMany();
    const deskEstimators = (allWorkers as any[]).filter(
      (w: any) =>
        w.status === "active" && (
          (w.position || "").toLowerCase().includes("desk estimator") ||
          (w.role || "").toLowerCase().includes("desk_estimator") ||
          (w.role || "").toLowerCase().includes("desk estimator")
        )
    );
    const deskEstimator =
      deskEstimators.find((e: any) => e.office === lead.office) ||
      deskEstimators[0] ||
      null;
    const assigneeId = deskEstimator?.id || lead.assignedTo || null;

    await prisma.task.create({
      data: {
        title: `Estimate Follow-Up - ${leadName}`,
        description: [
          `Customer: ${leadName}`,
          vars.address ? `Address: ${vars.address}` : "",
          lead.phone ? `Phone: ${lead.phone}` : "",
          lead.projectType ? `Project Type: ${lead.projectType}` : "",
          `Follow up on estimate sent to customer.`,
        ].filter(Boolean).join("\n"),
        status: "to_do",
        priority: "medium",
        dueDate: dueDateStr,
        assignedTo: assigneeId,
        createdBy: userId || "system",
        linkedEntityType: "lead",
        linkedEntityId: lead.id,
        autoCreated: true,
      },
    });
  }
}

/**
 * Run automation rules triggered by task completion.
 * Handles the chain: Site Visit task → Desk Estimator task → Proposal Sent + Follow-up.
 */
export async function runTaskCompletionAutomations(
  completedTask: any,
  linkedLead: any | null
) {
  const rules = await prisma.taskAutomationRule.findMany({
    where: {
      trigger: "task_completed",
      enabled: true,
    },
  });

  if (!rules || rules.length === 0) return;

  for (const rule of rules) {
    // Match triggerValue against completed task title (partial match)
    const triggerPattern = (rule.triggerValue || "").toLowerCase();
    const taskTitle = (completedTask.title || "").toLowerCase();
    if (!triggerPattern || !taskTitle.includes(triggerPattern)) continue;

    // Only proceed if task is linked to a lead
    if (!linkedLead) continue;

    const vars = {
      ...buildLeadVars(linkedLead),
      taskTitle: completedTask.title || "",
      completedDate: new Date().toLocaleDateString("en-US"),
    };

    // Action: change lead status if specified
    if (rule.leadStatusAction) {
      await prisma.lead.update({
        where: { id: linkedLead.id },
        data: { status: rule.leadStatusAction },
      });

      // Log activity for status change
      await prisma.activity.create({
        data: {
          parentType: "lead",
          parentId: linkedLead.id,
          leadId: linkedLead.id,
          type: "status_change",
          content: `Lead automatically moved to "${rule.leadStatusAction}" after "${completedTask.title}" was completed.`,
          user: "system",
        },
      });
    }

    // Action: create follow-up task if specified
    if (rule.taskTitle) {
      const title = interpolate(rule.taskTitle, vars);
      const description = interpolate(rule.taskDescription || "", vars);
      const assignedTo = await resolveAssignee(rule, linkedLead);

      await prisma.task.create({
        data: {
          title,
          description,
          status: "to_do",
          priority: rule.taskPriority || "medium",
          dueDate: null,
          assignedTo,
          createdBy: "system",
          linkedEntityType: "lead",
          linkedEntityId: linkedLead.id,
          autoCreated: true,
        },
      });
    }
  }
}

/**
 * Escalate overdue tasks to high priority.
 * Called server-side on tasks page load.
 */
export async function escalateOverdueTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  await prisma.task.updateMany({
    where: {
      status: { not: "completed" },
      dueDate: { lt: todayStr },
      priority: { not: "high" },
    },
    data: {
      priority: "high",
      updatedAt: new Date(),
    },
  });
}

/**
 * Replace {{variable}} placeholders with values.
 */
function interpolate(
  template: string,
  vars: Record<string, string>
): string {
  if (!template) return "";
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}
