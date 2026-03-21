import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const role = (session?.user as any)?.role || "TECHNICIAN";
    const isAdmin = role === "ADMIN" || role === "PROJECT_MANAGER" || role === "SUPERVISOR";
    const body = await req.json();

    const existing = await prisma.timeOff.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: any = {};

    if (isAdmin) {
      // Admin can approve/deny and edit any field
      if (body.status) {
        updateData.status = body.status;
        if (body.status === "approved") {
          updateData.approvedBy = (session?.user as any)?.id || null;
          updateData.approvedAt = new Date().toISOString();
        }
        if (body.status === "denied") {
          updateData.deniedReason = body.deniedReason || null;
        }
      }
      if (body.type) updateData.type = body.type;
      if (body.startDate) updateData.startDate = body.startDate;
      if (body.endDate) updateData.endDate = body.endDate;
      if (body.reason !== undefined) updateData.reason = body.reason;
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.workerId) updateData.workerId = body.workerId;
    } else {
      // Technician can only edit their own pending requests
      if (existing.status !== "pending") {
        return NextResponse.json({ error: "Can only edit pending requests" }, { status: 403 });
      }
      if (body.type) updateData.type = body.type;
      if (body.startDate) updateData.startDate = body.startDate;
      if (body.endDate) updateData.endDate = body.endDate;
      if (body.reason !== undefined) updateData.reason = body.reason;
      if (body.notes !== undefined) updateData.notes = body.notes;
    }

    const updated = await prisma.timeOff.update({ where: { id: params.id }, data: updateData });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const role = (session?.user as any)?.role || "TECHNICIAN";
    const isAdmin = role === "ADMIN" || role === "PROJECT_MANAGER" || role === "SUPERVISOR";

    const existing = await prisma.timeOff.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!isAdmin && existing.status !== "pending") {
      return NextResponse.json({ error: "Can only delete pending requests" }, { status: 403 });
    }

    await prisma.timeOff.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 400 });
  }
}
