import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireOrg();
  if (result instanceof NextResponse) return result;
  const { orgId } = result;

  const body = await req.json();
  const metric = await prisma.metric.update({
    where: orgWhere(orgId, { id: params.id }),
    data: body,
  });
  if (!metric) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(metric);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireOrg();
  if (result instanceof NextResponse) return result;
  const { orgId } = result;

  await prisma.metric.delete({ where: orgWhere(orgId, { id: params.id }) });
  return NextResponse.json({ success: true });
}
