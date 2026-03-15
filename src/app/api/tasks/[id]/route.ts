import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { updateTaskSchema, validateBody } from "@/lib/validations";
import { runTaskCompletionAutomations } from "@/lib/taskAutomation";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { sendNotificationToWorker, sendNotificationToRole, buildTaskNotificationBody } from "@/lib/notifications";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const task = await prisma.task.findFirst({
      where: { id: params.id, organizationId: orgId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const v = validateBody(updateTaskSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    // Get current task to detect status transitions
    const currentTask = await prisma.task.findFirst({
      where: { id: params.id, organizationId: orgId },
    });

    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate;
    if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo;
    if (body.linkedEntityType !== undefined) data.linkedEntityType = body.linkedEntityType;
    if (body.linkedEntityId !== undefined) data.linkedEntityId = body.linkedEntityId;

    // Set completedAt when transitioning to completed
    const isBeingCompleted =
      body.status === "completed" &&
      currentTask &&
      currentTask.status !== "completed";

    if (isBeingCompleted) {
      data.completedAt = new Date().toISOString();
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data,
    });

    // Send notification if assignee changed
    try {
      if (body.assignedTo && body.assignedTo !== currentTask.assignedTo) {
        const notifBody = buildTaskNotificationBody(task.title, "assigned", task.description || undefined);
        sendNotificationToWorker(body.assignedTo, "taskAssigned", `New Task: ${task.title}`, notifBody);
      }
    } catch { /* notification failure should not block response */ }

    // Send notification on task completion to admins/supervisors
    if (isBeingCompleted) {
      try {
        const notifBody = buildTaskNotificationBody(task.title, "completed");
        sendNotificationToRole("ADMIN", "taskCompleted", `Task Completed: ${task.title}`, notifBody);
        sendNotificationToRole("SUPERVISOR", "taskCompleted", `Task Completed: ${task.title}`, notifBody);
      } catch { /* notification failure should not block response */ }
    }

    // Run task completion automations if this task was just completed
    if (isBeingCompleted && currentTask) {
      const linkedEntityType = task.linkedEntityType || currentTask.linkedEntityType;
      const linkedEntityId = task.linkedEntityId || currentTask.linkedEntityId;

      if (linkedEntityType === "lead" && linkedEntityId) {
        const linkedLead = await prisma.lead.findUnique({
          where: { id: linkedEntityId },
          include: { company: true },
        });

        if (linkedLead) {
          await runTaskCompletionAutomations(task, linkedLead);

          // Log activity on the lead
          await prisma.activity.create({
            data: {
              parentType: "lead",
              parentId: linkedEntityId,
              type: "task_completed",
              title: `Task completed: ${task.title}`,
              description: `Auto-created task "${task.title}" was marked as completed.`,
              userId: body.userId || "system",
            },
          });
        }
      }
    }

    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Verify task belongs to org
    const existingTask = await prisma.task.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingTask) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.task.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
