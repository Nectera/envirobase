import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/estimate-follow-ups/[id]/cancel
 * Cancel an active follow-up sequence
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { orgId } = result;

    const { id } = params;
    const body = await req.json().catch(() => ({}));

    const followUp = await prisma.estimateFollowUp.findFirst({
      where: orgWhere(orgId, { id }),
    });
    if (!followUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    if (followUp.status === "cancelled" || followUp.status === "completed") {
      return NextResponse.json(
        { error: `Follow-up is already ${followUp.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.estimateFollowUp.update({
      where: orgWhere(orgId, { id }),
      data: {
        status: "cancelled",
        cancelledReason: body.reason || "Manually cancelled",
        sequenceComplete: true,
        nextTouchAt: null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Cancel follow-up error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
