import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST — add line item(s) to an estimate
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();

    // Support single or bulk items
    const items = Array.isArray(body) ? body : [body];

    const estimate = await prisma.projectEstimate.findUnique({ where: { id: params.id } });
    if (!estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    if (estimate.status === "approved") return NextResponse.json({ error: "Cannot modify approved estimate" }, { status: 400 });

    // Get current max sortOrder
    const maxSort = await prisma.estimateLineItem.findFirst({
      where: { estimateId: params.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    let nextSort = (maxSort?.sortOrder ?? -1) + 1;

    const created = [];
    for (const item of items) {
      const { xactItemId, xactCode, description, category, unit, quantity, unitPrice, notes, room } = item;
      if (!description || !unit || quantity === undefined || unitPrice === undefined) continue;

      const total = parseFloat(quantity) * parseFloat(unitPrice);
      const li = await prisma.estimateLineItem.create({
        data: {
          estimateId: params.id,
          xactItemId: xactItemId || null,
          xactCode: xactCode || "",
          description,
          category: category || null,
          unit,
          quantity: parseFloat(quantity),
          unitPrice: parseFloat(unitPrice),
          total,
          sortOrder: nextSort++,
          notes: notes || null,
          room: room || null,
        },
      });
      created.push(li);
    }

    // Recalculate estimate total
    const allItems = await prisma.estimateLineItem.findMany({ where: { estimateId: params.id } });
    const newTotal = allItems.reduce((sum: number, li: any) => sum + li.total, 0);
    await prisma.projectEstimate.update({
      where: { id: params.id },
      data: { totalAmount: newTotal },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Line item POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
