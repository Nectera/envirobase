import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/change-orders?projectId=...
 * List change orders for a project.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const orders = await prisma.changeOrder.findMany({
      where: orgWhere(orgId, { projectId }),
      orderBy: { number: "asc" },
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/change-orders
 * Create a new change order. PM, Supervisor, or Admin can create.
 * Body: { projectId, title, description, reason?, costImpact?, daysImpact? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = (session.user as any)?.role;
    if (!["ADMIN", "PROJECT_MANAGER", "SUPERVISOR"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, title, description, reason, costImpact, daysImpact } = body;

    if (!projectId || !title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "projectId, title, and description required" }, { status: 400 });
    }

    // Get next sequential number for this project
    const lastOrder = await prisma.changeOrder.findFirst({
      where: orgWhere(orgId, { projectId }),
      orderBy: { number: "desc" },
    });
    const nextNumber = (lastOrder?.number || 0) + 1;

    const userName = (session.user as any)?.name || (session.user as any)?.email || "Unknown";

    const order = await prisma.changeOrder.create({
      data: orgData(orgId, {
        projectId,
        number: nextNumber,
        title: title.trim(),
        description: description.trim(),
        reason: reason || null,
        costImpact: parseFloat(costImpact) || 0,
        daysImpact: parseInt(daysImpact) || 0,
        status: "pending_approval",
        createdBy: userName,
      }),
    });

    // Log activity on the project
    await prisma.activity.create({
      data: orgData(orgId, {
        parentType: "project",
        parentId: projectId,
        type: "note",
        content: `Change Order #${nextNumber} created: ${title.trim()}`,
        user: userName,
      }),
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error("Change order POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
