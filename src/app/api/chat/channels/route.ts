import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/channels
 * List all channels the current user is a member of, with unread counts and last message.
 */
export async function GET() {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const userId = session.user.id;

    // Get all channels user is a member of
    const memberships = await prisma.chatMember.findMany({
      where: { ...orgWhere(orgId), userId },
      include: {
        channel: {
          include: {
            members: { select: { userId: true } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { id: true, content: true, senderName: true, createdAt: true },
            },
          },
        },
      },
    });

    // Get read receipts for unread counts
    const channelIds = memberships.map((m: any) => m.channelId);
    const readReceipts = await prisma.chatReadReceipt.findMany({
      where: { ...orgWhere(orgId), userId, channelId: { in: channelIds } },
    });
    const receiptMap = new Map(readReceipts.map((r: any) => [r.channelId, r]));

    // Build response with unread counts
    const channels = await Promise.all(
      memberships.map(async (m: any) => {
        const receipt: any = receiptMap.get(m.channelId);
        let unreadCount = 0;

        if (receipt?.lastReadAt) {
          unreadCount = await prisma.chatMessage.count({
            where: {
              ...orgWhere(orgId),
              channelId: m.channelId,
              createdAt: { gt: receipt.lastReadAt },
              senderId: { not: userId },
            },
          });
        } else {
          // Never read — all messages are unread (except own)
          unreadCount = await prisma.chatMessage.count({
            where: {
              ...orgWhere(orgId),
              channelId: m.channelId,
              senderId: { not: userId },
            },
          });
        }

        const lastMessage = m.channel.messages[0] || null;

        // For DMs, show the other person's name instead of channel name
        let displayName = m.channel.name;
        if (m.channel.type === "dm") {
          const otherMemberId = m.channel.members.find((mem: any) => mem.userId !== userId)?.userId;
          if (otherMemberId) {
            const otherUser = await prisma.user.findUnique({
              where: { id: otherMemberId },
              select: { name: true },
            });
            if (otherUser) displayName = otherUser.name;
          }
        }

        return {
          id: m.channel.id,
          name: displayName,
          type: m.channel.type,
          description: m.channel.description,
          projectId: m.channel.projectId,
          isPrivate: m.channel.isPrivate,
          memberCount: m.channel.members.length,
          unreadCount,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content.slice(0, 100),
                senderName: lastMessage.senderName,
                createdAt: lastMessage.createdAt,
              }
            : null,
          createdAt: m.channel.createdAt,
        };
      })
    );

    // Sort: DMs and channels with unread first, then by last message time
    channels.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return NextResponse.json(channels);
  } catch (error: any) {
    console.error("Chat channels GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/chat/channels
 * Create a new channel. Body: { name, type?, description?, projectId?, memberIds? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const userId = session.user.id;

    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { name, type = "general", description, projectId, memberIds = [], isPrivate = false } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
    }

    // Create channel
    const channel = await prisma.chatChannel.create({
      data: orgData(orgId, {
        name: name.trim(),
        type,
        description: description?.trim() || null,
        projectId: projectId || null,
        isPrivate: type === "dm" ? true : !!isPrivate,
        createdBy: userId,
      }),
    });

    // Add creator as member
    await prisma.chatMember.create({
      data: orgData(orgId, { channelId: channel.id, userId }),
    });

    if (isPrivate && memberIds.length > 0) {
      // Restricted channel — only add specified members
      const uniqueMembers = Array.from(new Set(memberIds.filter((id: string) => id !== userId))) as string[];
      for (const memberId of uniqueMembers) {
        await prisma.chatMember.create({
          data: orgData(orgId, { channelId: channel.id, userId: memberId }),
        });
      }
    } else if (!isPrivate && type !== "dm") {
      // Open channel — auto-add all users
      const allUsers = await prisma.user.findMany({ ...orgWhere(orgId), select: { id: true } });
      for (const u of allUsers) {
        if ((u as any).id !== userId) {
          await prisma.chatMember.create({
            data: orgData(orgId, { channelId: channel.id, userId: (u as any).id }),
          }).catch(() => {}); // ignore if already exists
        }
      }
    }

    return NextResponse.json(channel, { status: 201 });
  } catch (error: any) {
    console.error("Chat channels POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
