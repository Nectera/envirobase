import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * GET /api/time-clock/overtime-approvals
 *
 * Returns all time entries flagged as overtime needing approval.
 * Optional ?status=flagged|approved|denied to filter.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userRole = (session.user as any)?.role;
    if (!isAdmin(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status = req.nextUrl.searchParams.get("status") || "flagged";

    const entries = await prisma.timeEntry.findMany({
      where: {
        overtime: true,
        ...(status !== "all" ? { approvalStatus: status } : {}),
        worker: { organizationId: orgId },
      },
      include: {
        worker: { select: { id: true, name: true, position: true } },
        project: { select: { id: true, name: true, number: true } },
      },
      orderBy: { clockIn: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error("Overtime approvals fetch error:", error?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/time-clock/overtime-approvals
 *
 * Approve or deny an overtime entry.
 * Body: { entryId, action: "approve" | "deny", note?: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const userRole = (session.user as any)?.role;
    if (!isAdmin(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { entryId, action, note } = body;

    if (!entryId || !["approve", "deny"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const userId = (session.user as any)?.id;

    const updated = await prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        approvalStatus: action === "approve" ? "approved" : "denied",
        approvedBy: userId,
        approvedAt: new Date(),
        ...(note ? { flagReason: note } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Overtime approval error:", error?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
