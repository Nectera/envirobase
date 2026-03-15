import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/chat/channels/[id]/read
 * Mark channel as read up to now.
 */
export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
