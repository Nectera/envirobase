import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT — update a line item
export async function PUT(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const data: any = {};
    if (body.xactCode !== undefined) data.xactCode = body.xactCode;
    if (body.description !== undefined) data.description = body.description;
    if (body.category !== undefined) data.category = body.category;
    if (body.unit !== undefined) data.unit = body.unit;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.room !== undefined) data.room = body.room;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

    if (body.quantity !== undefined || body.unitPrice !== undefined) {
      const existing = await prisma.estimateLineItem.findUnique({ where: { id: params.itemId } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const qty = body.quantity !== undefined ? parseFloat(body.quantity) : existing.quantity;
      const price = body.unitPrice !== undefined ? parseFloat(body.unitPrice) : existing.unitPrice;
      data.quantity = qty;
      data.unitPrice = price;
      data.total = qty * price;
    }

    const updated = await prisma.estimateLineItem.update({
      where: { id: params.itemId },
      data,
    });

    // Recalculate estimate total
    const allItems = await prisma.estimateLineItem.findMany({ where: { estimateId: params.id } });
    const newTotal = allItems.reduce((sum: number, li: any) => sum + li.total, 0);
    await prisma.projectEstimate.update({
      where: { id: params.id },
      data: { totalAmount: newTotal },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — remove a line item
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;

    await prisma.estimateLineItem.delete({ where: { id: params.itemId } });

    // Recalculate
    const allItems = await prisma.estimateLineItem.findMany({ where: { estimateId: params.id } });
    const newTotal = allItems.reduce((sum: number, li: any) => sum + li.total, 0);
    await prisma.projectEstimate.update({
      where: { id: params.id },
      data: { totalAmount: newTotal },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
