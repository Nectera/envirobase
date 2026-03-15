import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";

export async function GET() {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const rules = await prisma.taskAutomationRule.findMany({
    where: orgWhere(orgId),
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const body = await req.json();

  if (!body.name || !body.triggerValue || !body.taskTitle) {
    return NextResponse.json({ error: "name, triggerValue, and taskTitle are required" }, { status: 400 });
  }

  const rule = await prisma.taskAutomationRule.create({
    data: orgData(orgId, {
      name: body.name,
      enabled: body.enabled ?? true,
      trigger: body.trigger || "lead_status_change",
      triggerValue: body.triggerValue,
      taskTitle: body.taskTitle,
      taskDescription: body.taskDescription || "",
      taskPriority: body.taskPriority || "medium",
      assignToField: body.assignToField || "none",
      assignToValue: body.assignToValue || null,
      linkedEntity: body.linkedEntity ?? true,
      dueDateOffsetDays: body.dueDateOffsetDays ?? null,
    }),
  });

  return NextResponse.json(rule, { status: 201 });
}
