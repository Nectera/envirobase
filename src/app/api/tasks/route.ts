import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTaskSchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { sendNotificationToWorker, buildTaskNotificationBody } from "@/lib/notifications";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const assignedTo = url.searchParams.get("assignedTo");
    const priority = url.searchParams.get("priority");
    const linkedEntityType = url.searchParams.get("linkedEntityType");

    const where: any = { ...orgWhere(orgId) };
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;
    if (priority) where.priority = priority;
    if (linkedEntityType) where.linkedEntityType = linkedEntityType;

    const tasks = await prisma.task.findMany({
      where,

    });

    return NextResponse.json(tasks);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const v = validateBody(createTaskSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    const task = await prisma.task.create({
      data: orgData(orgId, {
        title: body.title,
        description: body.description || "",
        status: body.status || "to_do",
        priority: body.priority || "medium",
        dueDate: body.dueDate || null,
        assignedTo: body.assignedTo || null,
        linkedEntityType: body.linkedEntityType || null,
        linkedEntityId: body.linkedEntityId || null,
        autoCreated: body.autoCreated || false,
      }),
    });

    // Notify assigned worker about new task
    if (task.assignedTo) {
      try {
        const notifBody = buildTaskNotificationBody(task.title, "assigned", task.description || undefined);
        sendNotificationToWorker(task.assignedTo, "taskAssigned", `New Task: ${task.title}`, notifBody);
      } catch { /* notification failure should not block response */ }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
