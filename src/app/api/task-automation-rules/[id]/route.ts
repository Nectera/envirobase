import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session, orgId } = auth;

  const rule = await prisma.taskAutomationRule.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  return NextResponse.json(rule);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session, orgId } = auth;

  const existing = await prisma.taskAutomationRule.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  const body = await req.json();
  const data: any = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.enabled !== undefined) data.enabled = body.enabled;
  if (body.trigger !== undefined) data.trigger = body.trigger;
  if (body.triggerValue !== undefined) data.triggerValue = body.triggerValue;
  if (body.taskTitle !== undefined) data.taskTitle = body.taskTitle;
  if (body.taskDescription !== undefined) data.taskDescription = body.taskDescription;
  if (body.taskPriority !== undefined) data.taskPriority = body.taskPriority;
  if (body.assignToField !== undefined) data.assignToField = body.assignToField;
  if (body.assignToValue !== undefined) data.assignToValue = body.assignToValue;
  if (body.linkedEntity !== undefined) data.linkedEntity = body.linkedEntity;
  if (body.dueDateOffsetDays !== undefined) data.dueDateOffsetDays = body.dueDateOffsetDays;

  const rule = await prisma.taskAutomationRule.update({ where: { id: params.id }, data });
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  return NextResponse.json(rule);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session, orgId } = auth;

  const existing = await prisma.taskAutomationRule.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  await prisma.taskAutomationRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
