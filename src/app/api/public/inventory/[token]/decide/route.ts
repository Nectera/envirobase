import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/public/inventory/[token]/decide
 * Public endpoint — customer marks an item as "keep" or "dispose".
 * Body: { itemId: string, status: "keep" | "dispose", customerNote?: string }
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    // Validate token
    const review = await prisma.contentInventoryReview.findUnique({
      where: { token: params.token },
    });

    if (!review) {
      return NextResponse.json({ error: "Invalid or expired review link" }, { status: 404 });
    }

    if (review.status === "completed") {
      return NextResponse.json({ error: "This review has already been completed" }, { status: 400 });
    }

    const body = await req.json();
    const { itemId, status, customerNote } = body;

    if (!itemId || !["keep", "dispose"].includes(status)) {
      return NextResponse.json(
        { error: "itemId and status (keep/dispose) are required" },
        { status: 400 }
      );
    }

    // Verify item belongs to this review's project
    const item = await prisma.contentInventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.projectId !== review.projectId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Update item status
    const updated = await prisma.contentInventoryItem.update({
      where: { id: itemId },
      data: {
        status,
        customerNote: customerNote?.trim() || null,
      },
    });

    // Mark review as in_progress if still pending
    if (review.status === "pending") {
      await prisma.contentInventoryReview.update({
        where: { id: review.id },
        data: { status: "in_progress" },
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Public decide POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
