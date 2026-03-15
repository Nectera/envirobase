import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

/**
 * POST /api/review-requests/[id]/confirm
 * Admin confirms that a Google review actually appeared.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user?.role !== "ADMIN" && user?.role !== "SUPERVISOR" && user?.role !== "OFFICE") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const rl = checkRateLimit(`write:${user.id}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const reviewRequest = await prisma.reviewRequest.findUnique({
      where: { id: params.id },
    });

    if (!reviewRequest) {
      return NextResponse.json({ error: "Review request not found" }, { status: 404 });
    }

    const updated = await prisma.reviewRequest.update({
      where: { id: params.id },
      data: {
        reviewConfirmed: true,
        reviewConfirmedAt: new Date(),
        reviewConfirmedBy: user.id,
        status: "review_confirmed",
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Review confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/review-requests/[id]/confirm
 * Un-confirm a review (undo mistake).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const updated = await prisma.reviewRequest.update({
      where: { id: params.id },
      data: {
        reviewConfirmed: false,
        reviewConfirmedAt: null,
        reviewConfirmedBy: null,
        status: "survey_completed",
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Review un-confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
