import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { sendNotificationToUser } from "@/lib/notifications";
import { escapeHtml } from "@/lib/email";
import { isConnected, qbUploadReceipt } from "@/lib/quickbooks";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/channels/[id]/messages
 * Paginated messages for a channel. Query: ?skip=0&limit=50&after=ISO_DATE
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const userId = (session.user as any)?.id;

    // Verify user is a member
    const membership = await prisma.chatMember.findUnique({
      where: { channelId_userId: { channelId: params.id, userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
    }

    const url = new URL(req.url);
    const skip = parseInt(url.searchParams.get("skip") || "0");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const after = url.searchParams.get("after"); // ISO date string for polling

    const where: any = { channelId: params.id };
    if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: after ? 0 : skip,
        take: limit,
      }),
      prisma.chatMessage.count({ where: { channelId: params.id } }),
    ]);

    return NextResponse.json({
      messages,
      total,
      hasMore: skip + limit < total,
    });
  } catch (error: any) {
    console.error("Chat messages GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/chat/channels/[id]/messages
 * Send a message. Body: { content, mentions?, fileUrl?, fileName?, fileSize?, fileMimeType? }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const userId = (session.user as any)?.id;
    const userName = (session.user as any)?.name || "Unknown";

    const rl = checkRateLimit(`chat:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    // Verify user is a member
    const membership = await prisma.chatMember.findUnique({
      where: { channelId_userId: { channelId: params.id, userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
    }

    const body = await req.json();
    const { content, mentions, fileUrl, fileName, fileSize, fileMimeType } = body;

    if (!content?.trim() && !fileUrl) {
      return NextResponse.json({ error: "Message content or file is required" }, { status: 400 });
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        channelId: params.id,
        senderId: userId,
        senderName: userName,
        content: content?.trim() || "",
        mentions: mentions ? JSON.stringify(mentions) : null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        fileMimeType: fileMimeType || null,
      },
    });

    // Update sender's read receipt (they've read up to their own message)
    await prisma.chatReadReceipt.upsert({
      where: { channelId_userId: { channelId: params.id, userId } },
      update: { lastReadMessageId: message.id, lastReadAt: new Date() },
      create: { channelId: params.id, userId, lastReadMessageId: message.id, lastReadAt: new Date() },
    });

    // Send @mention notifications
    if (mentions && Array.isArray(mentions) && mentions.length > 0) {
      const channel = await prisma.chatChannel.findUnique({
        where: { id: params.id },
        select: { name: true },
      });
      const channelName = channel?.name || "a channel";
      const preview = (content || "").slice(0, 100);

      // Resolve @all to all channel member IDs
      let resolvedMentions = mentions as string[];
      if (resolvedMentions.includes("all")) {
        const members = await prisma.chatMember.findMany({
          where: { channelId: params.id },
          select: { userId: true },
        });
        const memberIds = members.map((m: any) => m.userId);
        resolvedMentions = Array.from(new Set([
          ...resolvedMentions.filter((id: string) => id !== "all"),
          ...memberIds,
        ]));
      }

      for (const mentionedUserId of resolvedMentions) {
        if (mentionedUserId === userId) continue; // Don't notify self
        try {
          const notifBody = `
            <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
              <strong>${escapeHtml(userName)}</strong> mentioned you in <strong>${escapeHtml(channelName)}</strong>:
            </p>
            <div style="background:#f8fafc;border-left:4px solid #7BC143;padding:12px 16px;border-radius:4px;margin:0 0 16px;">
              <p style="margin:0;color:#1e293b;font-size:14px;">${escapeHtml(preview)}${content.length > 100 ? "..." : ""}</p>
            </div>
          `;
          sendNotificationToUser(
            mentionedUserId,
            "taskAssigned", // reuse existing notification type
            `${userName} mentioned you in ${channelName}`,
            notifBody,
          );
        } catch { /* notification failure should not block message send */ }
      }
    }

    // Auto-sync receipts to QuickBooks when a file is posted in the "Receipts" channel
    if (fileUrl && fileName) {
      try {
        const channel = await prisma.chatChannel.findUnique({
          where: { id: params.id },
          select: { name: true },
        });
        const isReceiptsChannel = channel?.name?.toLowerCase().replace(/\s+/g, "") === "receipts";

        if (isReceiptsChannel && await isConnected()) {
          // Download the file from Supabase and push to QuickBooks (fire-and-forget)
          const syncToQb = async () => {
            try {
              const fileRes = await fetch(fileUrl);
              if (!fileRes.ok) throw new Error(`Failed to download file: ${fileRes.status}`);
              const buffer = Buffer.from(await fileRes.arrayBuffer());
              const note = content?.trim()
                ? `${content.trim()} — Uploaded by ${userName}`
                : `Receipt uploaded by ${userName}`;
              await qbUploadReceipt(buffer, fileName, fileMimeType || "application/octet-stream", note);
              logger.info("Receipt synced to QuickBooks", { messageId: message.id, fileName });
            } catch (err) {
              logger.error("Failed to sync receipt to QuickBooks", { error: String(err), messageId: message.id });
            }
          };
          // Don't await — sync happens in background so the message response isn't delayed
          syncToQb();
        }
      } catch { /* channel lookup failure should not block message */ }
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    console.error("Chat messages POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
