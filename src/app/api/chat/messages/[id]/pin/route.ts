import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/messages/[id]/pin
 * Toggle pin on a message. Any member can pin/unpin.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;
    const userId = (session.user as any)?.id;
    const userName = (session.user as any)?.name || "Unknown";

    const rl = checkRateLimit(`chat-pin:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const message = await prisma.chatMessage.findUnique({ where: { id: params.id } });
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const isPinned = !!message.pinnedAt;

    const updated = await prisma.chatMessage.update({
      where: { id: params.id },
      data: isPinned
        ? { pinnedAt: null, pinnedBy: null }
        : { pinnedAt: new Date(), pinnedBy: userName },
    });

    return NextResponse.json({ pinned: !!updated.pinnedAt });
  } catch (error: any) {
    console.error("Chat message pin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
