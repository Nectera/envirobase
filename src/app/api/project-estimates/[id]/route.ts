import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { notifyClientEstimateUpdate } from "@/lib/portalNotifications";

export const dynamic = "force-dynamic";

// PUT — update estimate status, metadata, or submit/approve/deny
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = (session.user as any)?.role;
    const userName = (session.user as any)?.name || (session.user as any)?.email || "Unknown";
    const body = await req.json();
    const { action, ...fields } = body;

    const estimate = await prisma.projectEstimate.findUnique({
      where: { id: params.id },
      include: { lineItems: true },
    });
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Handle status actions
    if (action === "submit") {
      const total = estimate.lineItems.reduce((sum: number, li: any) => sum + li.total, 0);
      const updated = await prisma.projectEstimate.update({
        where: { id: params.id },
        data: { status: "submitted", submittedAt: new Date(), totalAmount: total },
      });
      try {
        await prisma.activity.create({
          data: orgData(orgId, {
            parentType: "project",
            parentId: estimate.projectId,
            type: "status_change",
            content: `Submitted ${estimate.type} estimate "${estimate.title}" — $${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            user: userName,
          }),
        });
      } catch {}
      // Notify portal clients
      const submitProject = await prisma.project.findUnique({ where: { id: estimate.projectId }, select: { name: true, organizationId: true } });
      if (submitProject?.organizationId) {
        notifyClientEstimateUpdate(estimate.projectId, submitProject.organizationId, submitProject.name, estimate.title || "Estimate", "submitted", total).catch(() => {});
      }
      return NextResponse.json(updated);
    }

    if (action === "approve") {
      if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
      const updated = await prisma.projectEstimate.update({
        where: { id: params.id },
        data: {
          status: "approved",
          approvedAt: new Date(),
          approvedAmount: fields.approvedAmount ?? estimate.totalAmount,
        },
      });
      try {
        await prisma.activity.create({
          data: orgData(orgId, {
            parentType: "project",
            parentId: estimate.projectId,
            type: "status_change",
            content: `Approved estimate "${estimate.title}" — $${(updated.approvedAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            user: userName,
          }),
        });
      } catch {}
      // Notify portal clients
      const approveProject = await prisma.project.findUnique({ where: { id: estimate.projectId }, select: { name: true, organizationId: true } });
      if (approveProject?.organizationId) {
        notifyClientEstimateUpdate(estimate.projectId, approveProject.organizationId, approveProject.name, estimate.title || "Estimate", "approved", updated.approvedAmount || undefined).catch(() => {});
      }
      return NextResponse.json(updated);
    }

    if (action === "deny") {
      if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
      const updated = await prisma.projectEstimate.update({
        where: { id: params.id },
        data: {
          status: "denied",
          deniedAt: new Date(),
          denialReason: fields.denialReason || null,
        },
      });
      try {
        await prisma.activity.create({
          data: orgData(orgId, {
            parentType: "project",
            parentId: estimate.projectId,
            type: "status_change",
            content: `Denied estimate "${estimate.title}"${fields.denialReason ? `: ${fields.denialReason}` : ""}`,
            user: userName,
          }),
        });
      } catch {}
      // Notify portal clients
      const denyProject = await prisma.project.findUnique({ where: { id: estimate.projectId }, select: { name: true, organizationId: true } });
      if (denyProject?.organizationId) {
        notifyClientEstimateUpdate(estimate.projectId, denyProject.organizationId, denyProject.name, estimate.title || "Estimate", "denied").catch(() => {});
      }
      return NextResponse.json(updated);
    }

    // Generic field updates
    const data: any = {};
    if (fields.title !== undefined) data.title = fields.title;
    if (fields.notes !== undefined) data.notes = fields.notes;
    if (fields.status !== undefined) data.status = fields.status;

    const updated = await prisma.projectEstimate.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Project estimate PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const role = (session.user as any)?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const estimate = await prisma.projectEstimate.findUnique({ where: { id: params.id } });
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (estimate.status === "approved") return NextResponse.json({ error: "Cannot delete approved estimates" }, { status: 400 });

    await prisma.estimateLineItem.deleteMany({ where: { estimateId: params.id } });
    await prisma.projectEstimate.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
