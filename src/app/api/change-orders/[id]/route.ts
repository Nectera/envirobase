import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PUT /api/change-orders/[id]
 * Update a change order — or approve/reject (admin only).
 *
 * Body for edit: { title?, description?, reason?, costImpact?, daysImpact? }
 * Body for approval: { action: "approve" | "reject", rejectionNote? }
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = (session.user as any)?.role;
    const userName = (session.user as any)?.name || (session.user as any)?.email || "Unknown";
    const body = await req.json();

    const existing = await prisma.changeOrder.findUnique({
      where: { id: params.id },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Handle approval/rejection (admin only)
    if (body.action === "approve" || body.action === "reject") {
      if (role !== "ADMIN") {
        return NextResponse.json({ error: "Only admins can approve change orders" }, { status: 403 });
      }

      const newStatus = body.action === "approve" ? "approved" : "rejected";
      const now = new Date().toISOString();

      const updated = await prisma.changeOrder.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          approvedBy: userName,
          approvedAt: now,
          rejectionNote: body.action === "reject" ? (body.rejectionNote || null) : null,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: orgData(orgId, {
          parentType: "project",
          parentId: existing.projectId,
          type: "status_change",
          content: `Change Order #${existing.number} ${newStatus}: ${existing.title}${body.action === "reject" && body.rejectionNote ? ` — ${body.rejectionNote}` : ""}`,
          user: userName,
        }),
      });

      // If approved, update project timeline if there's a days impact
      if (body.action === "approve" && existing.daysImpact !== 0) {
        const project = await prisma.project.findUnique({ where: { id: existing.projectId } });
        if (project?.estEndDate) {
          const currentEnd = new Date(project.estEndDate + "T00:00:00");
          currentEnd.setDate(currentEnd.getDate() + existing.daysImpact);
          const newEndDate = currentEnd.toISOString().split("T")[0];
          await prisma.project.update({
            where: { id: existing.projectId },
            data: {
              estEndDate: newEndDate,
              estimatedDays: project.estimatedDays ? project.estimatedDays + existing.daysImpact : undefined,
            },
          });

          await prisma.activity.create({
            data: orgData(orgId, {
              parentType: "project",
              parentId: existing.projectId,
              type: "status_change",
              content: `Project end date adjusted by ${existing.daysImpact > 0 ? "+" : ""}${existing.daysImpact} days to ${newEndDate} (CO #${existing.number})`,
              user: "System",
            }),
          });
        }
      }

      return NextResponse.json(updated);
    }

    // Handle regular edit (only if still draft or pending)
    if (!["draft", "pending_approval"].includes(existing.status)) {
      return NextResponse.json({ error: "Cannot edit an approved or rejected change order" }, { status: 400 });
    }

    if (!["ADMIN", "PROJECT_MANAGER", "SUPERVISOR"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.reason !== undefined) updateData.reason = body.reason || null;
    if (body.costImpact !== undefined) updateData.costImpact = parseFloat(body.costImpact) || 0;
    if (body.daysImpact !== undefined) updateData.daysImpact = parseInt(body.daysImpact) || 0;
    if (body.estimateData !== undefined) updateData.estimateData = body.estimateData;
    if (body.laborCost !== undefined) updateData.laborCost = parseFloat(body.laborCost) || null;
    if (body.cogsCost !== undefined) updateData.cogsCost = parseFloat(body.cogsCost) || null;
    if (body.materialCost !== undefined) updateData.materialCost = parseFloat(body.materialCost) || null;
    if (body.opsCost !== undefined) updateData.opsCost = parseFloat(body.opsCost) || null;
    if (body.totalCost !== undefined) updateData.totalCost = parseFloat(body.totalCost) || null;
    if (body.customerPrice !== undefined) updateData.customerPrice = parseFloat(body.customerPrice) || null;

    const updated = await prisma.changeOrder.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Change order PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/change-orders/[id]
 * Delete a change order (admin only, and only if not approved).
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const role = (session.user as any)?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can delete change orders" }, { status: 403 });
    }

    const existing = await prisma.changeOrder.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing.status === "approved") {
      return NextResponse.json({ error: "Cannot delete an approved change order" }, { status: 400 });
    }

    await prisma.changeOrder.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
