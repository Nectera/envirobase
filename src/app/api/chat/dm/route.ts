import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/dm
 * Find or create a DM channel between the current user and one or more other users.
 * Body: { userId: string } — single DM (backwards compatible)
 *   OR  { userIds: string[] } — multi-person DM
 */
export async function POST(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const currentUserId = (session.user as any)?.id;

    const rl = checkRateLimit(`write:${currentUserId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();

    // Support both single userId and array userIds
    let otherUserIds: string[] = [];
    if (body.userIds && Array.isArray(body.userIds)) {
      otherUserIds = body.userIds.filter((id: string) => id !== currentUserId);
    } else if (body.userId) {
      otherUserIds = [body.userId];
    }

    if (otherUserIds.length === 0) return NextResponse.json({ error: "At least one userId is required" }, { status: 400 });

    const allMemberIds = [currentUserId, ...otherUserIds].sort();

    // Check if DM channel already exists with this exact set of members
    const existingChannels = await prisma.chatChannel.findMany({
      where: { type: "dm" },
      include: { members: { select: { userId: true } } },
    });

    const existingDm = existingChannels.find((ch: any) => {
      const memberIds = ch.members.map((m: any) => m.userId).sort();
      return (
        memberIds.length === allMemberIds.length &&
        memberIds.every((id: string, i: number) => id === allMemberIds[i])
      );
    });

    if (existingDm) {
      return NextResponse.json({ channelId: existingDm.id, existing: true });
    }

    // Get names for all other users
    const otherUsers = await prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: { id: true, name: true },
    });

    // Channel name: for 1-on-1, use both names; for multi, list other names
    const otherNames = otherUsers.map((u: any) => u.name || "User");
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { name: true },
    });
    const channelName = otherUserIds.length === 1
      ? `${currentUser?.name || "User"} & ${otherNames[0]}`
      : otherNames.join(", ");

    // Create new DM channel
    const channel = await prisma.chatChannel.create({
      data: {
        name: channelName,
        type: "dm",
        isPrivate: true,
        createdBy: currentUserId,
      },
    });

    // Add all users as members
    await prisma.chatMember.createMany({
      data: allMemberIds.map((userId: string) => ({
        channelId: channel.id,
        userId,
      })),
    });

    return NextResponse.json({ channelId: channel.id, existing: false }, { status: 201 });
  } catch (error: any) {
    console.error("Chat DM POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
