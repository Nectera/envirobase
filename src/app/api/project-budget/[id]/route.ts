import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PUT /api/project-budget/[id]
 * Update a budget line item
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const user = session.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const data: any = {};

    if (body.description !== undefined) data.description = body.description;
    if (body.budgetAmount !== undefined) data.budgetAmount = parseFloat(body.budgetAmount) || 0;
    if (body.actualAmount !== undefined) data.actualAmount = parseFloat(body.actualAmount) || 0;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.category !== undefined) data.category = body.category;

    const line = await prisma.projectBudgetLine.update({
      where: orgWhere(orgId, { id: params.id }),
      data,
    });

    return NextResponse.json(line);
  } catch (error: any) {
    console.error("Budget PUT error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/project-budget/[id]
 * Delete a budget line item
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const user = session.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    await prisma.projectBudgetLine.delete({
      where: orgWhere(orgId, { id: params.id }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Budget DELETE error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
