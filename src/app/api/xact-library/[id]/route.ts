import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT — update a line item
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const role = (session.user as any)?.role;
    if (!["ADMIN", "PROJECT_MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data: any = {};
    if (body.code !== undefined) data.code = body.code.trim();
    if (body.category !== undefined) data.category = body.category.trim().toUpperCase();
    if (body.description !== undefined) data.description = body.description.trim();
    if (body.unit !== undefined) data.unit = body.unit.trim().toUpperCase();
    if (body.defaultRate !== undefined) data.defaultRate = body.defaultRate ? parseFloat(body.defaultRate) : null;
    if (body.projectTypes !== undefined) data.projectTypes = body.projectTypes;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.favorite !== undefined) data.favorite = body.favorite;

    const item = await prisma.xactLineItem.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — remove a line item
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const role = (session.user as any)?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    await prisma.xactLineItem.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
