import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const { searchParams } = new URL(req.url);
  const workerId = searchParams.get("workerId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");

  const where: any = orgWhere(orgId);
  if (workerId) where.workerId = workerId;
  if (status) where.status = status;
  if (startDate && endDate) where.dateRange = { start: startDate, end: endDate };

  const entries = await prisma.timeOff.findMany({ where, include: { worker: true } });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = session.user.role || "TECHNICIAN";
    const body = await req.json();

    const isAdmin = role === "ADMIN" || role === "SUPERVISOR";

    const entry = await prisma.timeOff.create({
      data: orgData(orgId, {
        workerId: body.workerId,
        type: body.type || "vacation",
        startDate: body.startDate,
        endDate: body.endDate,
        status: isAdmin ? (body.status || "approved") : "pending",
        reason: body.reason || null,
        notes: body.notes || null,
        requestedBy: body.requestedBy || null,
        approvedBy: isAdmin && (body.status === "approved" || !body.status) ? session.user.id || null : null,
        approvedAt: isAdmin && (body.status === "approved" || !body.status) ? new Date().toISOString() : null,
        deniedReason: null,
      }),
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 400 });
  }
}
