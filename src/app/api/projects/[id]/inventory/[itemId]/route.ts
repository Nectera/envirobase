import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

/**
 * PUT /api/projects/[id]/inventory/[itemId]
 * Update an inventory item. Body: { brand?, model?, description?, location?, status?, customerNote? }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const userId = (session.user as any)?.id;

    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const data: any = {};

    if (body.brand !== undefined) data.brand = body.brand?.trim() || null;
    if (body.model !== undefined) data.model = body.model?.trim() || null;
    if (body.description !== undefined) data.description = body.description?.trim();
    if (body.location !== undefined) data.location = body.location?.trim() || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.customerNote !== undefined) data.customerNote = body.customerNote?.trim() || null;

    const item = await prisma.contentInventoryItem.update({
      where: orgWhere(orgId, { id: params.itemId }),
      data,
      include: { photos: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("Inventory PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/inventory/[itemId]
 * Delete an inventory item and its photos.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const userId = (session.user as any)?.id;

    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    // Photos cascade-delete via Prisma relation
    await prisma.contentInventoryItem.delete({
      where: orgWhere(orgId, { id: params.itemId }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Inventory DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
