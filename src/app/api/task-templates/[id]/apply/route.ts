import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const template = await prisma.taskTemplate.findUnique({ where: { id: params.id } });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const body = await req.json();
  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const assignedTo = body.assignedTo || null;
  const linkedEntityType = body.linkedEntityType || null;
  const linkedEntityId = body.linkedEntityId || null;
  const createdBy = body.createdBy || null;

  const tasks = (template as any).tasks || [];
  const createdTasks = [];

  for (const item of tasks) {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + (item.dayOffset || 0));

    const task = await prisma.task.create({
      data: {
        title: item.title,
        description: item.description || "",
        status: "to_do",
        priority: item.priority || "medium",
        dueDate: dueDate.toISOString(),
        assignedTo,
        createdBy,
        linkedEntityType,
        linkedEntityId,
        autoCreated: true,
      },
    });

    createdTasks.push(task);
  }

  return NextResponse.json({ created: createdTasks.length, tasks: createdTasks }, { status: 201 });
}
