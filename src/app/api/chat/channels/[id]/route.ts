import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

/**
 * PUT /api/chat/channels/[id]
 * Update channel name and/or description.
 * Body: { name?: string, description?: string }
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const currentUserId = (session.user as any)?.id;

    const rl = checkRateLimit(`write:${currentUserId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    // Verify user is a member
    const membership = await prisma.chatMember.findUnique({
      where: { channelId_userId: { channelId: params.id, userId: currentUserId } },
    });
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const channel = await prisma.chatChannel.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(channel);
  } catch (error: any) {
    console.error("Chat channel PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/channels/[id]
 * Delete a channel and all related data (messages, members, read receipts cascade).
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const currentUserId = (session.user as any)?.id;

    const rl = checkRateLimit(`write:${currentUserId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    // Verify user is a member
    const membership = await prisma.chatMember.findUnique({
      where: { channelId_userId: { channelId: params.id, userId: currentUserId } },
    });
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    // Cascade delete handles messages, members, read receipts
    await prisma.chatChannel.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Chat channel DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
