import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/chat/channels/[id]/read
 * Mark channel as read up to now.
 */
export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const userId = (session.user as any)?.id;

    // Get latest message ID
    const latestMessage = await prisma.chatMessage.findFirst({
      where: { channelId: params.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    await prisma.chatReadReceipt.upsert({
      where: { channelId_userId: { channelId: params.id, userId } },
      update: {
        lastReadMessageId: latestMessage?.id || null,
        lastReadAt: new Date(),
      },
      create: {
        channelId: params.id,
        userId,
        lastReadMessageId: latestMessage?.id || null,
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Chat read PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
