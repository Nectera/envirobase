import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/messages/[id]/forward
 * Forward a message to another channel.
 * Body: { channelId: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;
    const userId = (session.user as any)?.id;
    const userName = (session.user as any)?.name || "Unknown";

    const rl = checkRateLimit(`chat-fwd:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { channelId } = body;

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    // Get the original message
    const original = await prisma.chatMessage.findUnique({ where: { id: params.id } });
    if (!original) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify user is a member of the target channel
    const membership = await prisma.chatMember.findFirst({
      where: { channelId, userId },
    });
    if (!membership) {
      return NextResponse.json({ error: "You are not a member of the target channel" }, { status: 403 });
    }

    // Create forwarded message
    const fwdContent = original.content
      ? `↪ Forwarded from ${original.senderName}:\n${original.content}`
      : `↪ Forwarded a file from ${original.senderName}`;

    const forwarded = await prisma.chatMessage.create({
      data: {
        channelId,
        senderId: userId,
        senderName: userName,
        content: fwdContent,
        fileUrl: original.fileUrl,
        fileName: original.fileName,
        fileSize: original.fileSize,
        fileMimeType: original.fileMimeType,
      },
    });

    return NextResponse.json(forwarded, { status: 201 });
  } catch (error: any) {
    console.error("Forward message error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
