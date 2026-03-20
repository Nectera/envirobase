import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

// POST /api/chat/meet – Generate a meeting link and post it to a channel
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const userName = session.user.name || "Unknown";

    const { channelId } = await req.json();
    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    // Verify user is a member of this channel
    const membership = await prisma.chatMember.findFirst({
      where: { channelId, userId },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
    }

    // Check org's meeting platform preference (default: google_meet)
    const platformSetting = await prisma.setting.findFirst({
      where: { key: `meetingPlatform_${orgId}`, organizationId: orgId },
    });
    const platform = platformSetting?.value || "google_meet";

    if (platform === "disabled") {
      return NextResponse.json({ error: "Meetings are disabled for this organization" }, { status: 400 });
    }

    const isZoom = platform === "zoom";
    const meetUrl = isZoom ? "https://zoom.us/start" : "https://meet.google.com/new";
    const platformLabel = isZoom ? "Zoom Meeting" : "Google Meet";
    const emoji = isZoom ? "\uD83D\uDCF9" : "\uD83D\uDCF9"; // 📹

    // Post the meeting link as a message in the channel
    const message = await prisma.chatMessage.create({
      data: {
        channelId,
        senderId: userId,
        senderName: userName,
        content: `${emoji} Started a ${platformLabel}\n${meetUrl}`,
        mentions: "[]",
      },
    });

    // Update sender's read receipt
    await prisma.chatReadReceipt.upsert({
      where: {
        channelId_userId: { channelId, userId },
      },
      update: { lastReadAt: new Date(), lastReadMessageId: message.id },
      create: {
        channelId,
        userId,
        lastReadAt: new Date(),
        lastReadMessageId: message.id,
      },
    });

    return NextResponse.json({
      meetUrl,
      message,
      platform,
    });
  } catch (error) {
    console.error("Error creating meet:", error);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
