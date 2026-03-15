import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

/**
 * GET /api/chat/channels/[id]/members
 * List members of a channel with user details.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const members = await prisma.chatMember.findMany({
      where: { channelId: params.id },
    });

    // Fetch user details for each member
    const userIds = members.map((m: any) => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    });
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const memberList = members.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      joinedAt: m.joinedAt,
      user: userMap.get(m.userId) || { id: m.userId, name: "Unknown", email: "", role: "" },
    }));

    return NextResponse.json(memberList);
  } catch (error: any) {
    console.error("Chat members GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/chat/channels/[id]/members
 * Add a member to a channel. Body: { userId }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const currentUserId = (session.user as any)?.id;

    const rl = checkRateLimit(`write:${currentUserId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    if (!body.userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    // Check if already a member
    const existing = await prisma.chatMember.findUnique({
      where: { channelId_userId: { channelId: params.id, userId: body.userId } },
    });
    if (existing) return NextResponse.json({ error: "Already a member" }, { status: 409 });

    const member = await prisma.chatMember.create({
      data: { channelId: params.id, userId: body.userId },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    console.error("Chat members POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/channels/[id]/members
 * Remove a member. Query: ?userId=xxx
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const currentUserId = (session.user as any)?.id;

    const rl = checkRateLimit(`write:${currentUserId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId param required" }, { status: 400 });

    await prisma.chatMember.delete({
      where: { channelId_userId: { channelId: params.id, userId } },
    });

    // Also remove read receipt
    await prisma.chatReadReceipt.deleteMany({
      where: { channelId: params.id, userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Chat members DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
