import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/inventory/[token]
 * Public endpoint — fetch all inventory items for a review token.
 * No auth required — the token itself is the authentication.
 */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    // Validate token
    const review = await prisma.contentInventoryReview.findUnique({
      where: { token: params.token },
      include: {
        project: { select: { id: true, name: true, client: true, address: true } },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Invalid or expired review link" }, { status: 404 });
    }

    // Fetch all items with photos
    const items = await prisma.contentInventoryItem.findMany({
      where: { projectId: review.projectId },
      include: { photos: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      review: {
        id: review.id,
        status: review.status,
        customerName: review.customerName,
        completedAt: review.completedAt,
      },
      project: review.project,
      items,
      stats: {
        total: items.length,
        pending: items.filter((i: any) => i.status === "pending").length,
        keep: items.filter((i: any) => i.status === "keep").length,
        dispose: items.filter((i: any) => i.status === "dispose").length,
      },
    });
  } catch (error: any) {
    console.error("Public inventory GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
