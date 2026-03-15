import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const data = await req.json();
  const license = await prisma.companyLicense.update({
    where: orgWhere(orgId, { id: params.id }),
    data,
  });
  return NextResponse.json(license);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  await prisma.companyLicense.delete({
    where: orgWhere(orgId, { id: params.id }),
  });
  return NextResponse.json({ ok: true });
}
