import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/estimate-follow-ups/[id]/cancel
 * Cancel an active follow-up sequence
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const body = await req.json().catch(() => ({}));

    const followUp = await prisma.estimateFollowUp.findUnique({ where: { id } });
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
      where: { id },
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
