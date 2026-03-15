import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotificationToUser } from "@/lib/notifications";
import { escapeHtml } from "@/lib/email";

/**
 * POST /api/public/inventory/[token]/complete
 * Public endpoint — customer submits all decisions and completes the review.
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    // Validate token
    const review = await prisma.contentInventoryReview.findUnique({
      where: { token: params.token },
      include: {
        project: { select: { name: true } },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Invalid or expired review link" }, { status: 404 });
    }

    if (review.status === "completed") {
      return NextResponse.json({ error: "This review has already been completed" }, { status: 400 });
    }

    // Get item stats
    const items = await prisma.contentInventoryItem.findMany({
      where: { projectId: review.projectId },
    });

    const pending = items.filter((i: any) => i.status === "pending").length;

    if (pending > 0) {
      return NextResponse.json(
        { error: `${pending} item(s) still need a decision. Please mark all items as Keep or Dispose before submitting.` },
        { status: 400 }
      );
    }

    // Mark review as completed
    await prisma.contentInventoryReview.update({
      where: { id: review.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    const keepCount = items.filter((i: any) => i.status === "keep").length;
    const disposeCount = items.filter((i: any) => i.status === "dispose").length;

    // Notify the person who sent the review link
    if (review.sentBy) {
      const projectName = review.project?.name || "Unknown Project";
      const customerLabel = review.customerName || "The customer";

      await sendNotificationToUser(
        review.sentBy,
        "inventoryReviewCompleted" as any,
        `Content Inventory Review Completed — ${projectName}`,
        `
          <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
            ${escapeHtml(customerLabel)} has completed their content inventory review for <strong>${escapeHtml(projectName)}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 16px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Total Items: <strong style="color:#1e293b;">${items.length}</strong></p>
              <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Keep: <strong style="color:#16a34a;">${keepCount}</strong></p>
              <p style="margin:0;color:#64748b;font-size:12px;">Dispose: <strong style="color:#ef4444;">${disposeCount}</strong></p>
            </td></tr>
          </table>
        `
      ).catch((err: any) => console.error("Failed to send review completion notification:", err));
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: items.length,
        keep: keepCount,
        dispose: disposeCount,
      },
    });
  } catch (error: any) {
    console.error("Public complete POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
