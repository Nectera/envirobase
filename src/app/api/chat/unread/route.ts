import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/unread
 * Get total unread message count across all channels for the current user.
 * Used by the sidebar badge — polled every 30 seconds.
 */
export async function GET() {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const userId = (session.user as any)?.id;

    // Get all channels user is a member of
    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      select: { channelId: true },
    });

    if (memberships.length === 0) {
      return NextResponse.json({ total: 0, channels: {} });
    }

    const channelIds = memberships.map((m: any) => m.channelId);

    // Get read receipts
    const receipts = await prisma.chatReadReceipt.findMany({
      where: { userId, channelId: { in: channelIds } },
    });
    const receiptMap = new Map(receipts.map((r: any) => [r.channelId, r]));

    let total = 0;
    const channels: Record<string, number> = {};

    for (const channelId of channelIds) {
      const receipt: any = receiptMap.get(channelId);
      let count = 0;

      if (receipt?.lastReadAt) {
        count = await prisma.chatMessage.count({
          where: {
            channelId,
            createdAt: { gt: receipt.lastReadAt },
            senderId: { not: userId },
          },
        });
      } else {
        count = await prisma.chatMessage.count({
          where: { channelId, senderId: { not: userId } },
        });
      }

      if (count > 0) {
        channels[channelId] = count;
        total += count;
      }
    }

    return NextResponse.json({ total, channels });
  } catch (error: any) {
    console.error("Chat unread GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
