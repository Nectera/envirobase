import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * PUT /api/chat/messages/[id]
 * Edit a message. Only the original sender can edit. Body: { content }
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;
    const userId = (session.user as any)?.id;

    const rl = checkRateLimit(`chat-edit:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const message = await prisma.chatMessage.findUnique({ where: { id: params.id } });
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (message.senderId !== userId) {
      return NextResponse.json({ error: "You can only edit your own messages" }, { status: 403 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const updated = await prisma.chatMessage.update({
      where: { id: params.id },
      data: { content },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Chat message PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/messages/[id]
 * Delete a message. Only the original sender or admins can delete.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;
    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    const message = await prisma.chatMessage.findUnique({ where: { id: params.id } });
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (message.senderId !== userId && userRole !== "admin") {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
    }

    // Delete associated reactions
    await prisma.reaction.deleteMany({
      where: { targetType: "message", targetId: params.id },
    });

    // Delete starred references
    await prisma.starredMessage.deleteMany({
      where: { messageId: params.id },
    });

    await prisma.chatMessage.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Chat message DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
