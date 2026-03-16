import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const body = await req.json();
  const metric = await prisma.metric.update({
    where: orgWhere(orgId, { id: params.id }),
    data: body,
  });
  if (!metric) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(metric);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  await prisma.metric.delete({ where: orgWhere(orgId, { id: params.id }) });
  return NextResponse.json({ success: true });
}
