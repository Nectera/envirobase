import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotificationToRole } from "@/lib/notifications";
import { APP_NAME } from "@/lib/branding";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/portal/[token]/messages
 * Public endpoint — client sends a message through the portal.
 * Also creates an activity entry on the project so the team sees it in-app.
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const portal = await prisma.customerPortal.findUnique({
      where: { token: params.token },
      include: {
        project: { select: { id: true, name: true, client: true, organizationId: true } },
      },
    });

    if (!portal || !portal.active) {
      return NextResponse.json({ error: "Invalid or expired portal link" }, { status: 404 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Limit message length
    const trimmed = content.trim().slice(0, 2000);
    const senderName = portal.clientName || portal.project.client || "Client";

    // Create the portal message
    const message = await prisma.portalMessage.create({
      data: {
        portalId: portal.id,
        sender: senderName,
        isClient: true,
        content: trimmed,
      },
    });

    // Also log as activity on the project so the team sees it
    await prisma.activity.create({
      data: {
        parentType: "project",
        parentId: portal.project.id,
        type: "note",
        content: `Portal message from ${senderName}: ${trimmed}`,
        user: senderName,
        organizationId: (portal.project as any).organizationId || undefined,
      },
    });

    // Notify admin + PM that a client sent a message
    const subject = `New Portal Message: ${portal.project.name}`;
    const emailBody = `
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
        <strong>${senderName}</strong> sent a message through the customer portal for project <strong>${portal.project.name}</strong>:
      </p>
      <div style="margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-left:3px solid #7BC143;border-radius:4px;">
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">${trimmed}</p>
      </div>
      <p style="margin:0;color:#64748b;font-size:13px;">
        Reply from the project activity feed in ${APP_NAME}.
      </p>
    `;

    await sendNotificationToRole("ADMIN", "taskAssigned", subject, emailBody);
    await sendNotificationToRole("PROJECT_MANAGER", "taskAssigned", subject, emailBody);

    return NextResponse.json({
      id: message.id,
      sender: message.sender,
      isClient: message.isClient,
      content: message.content,
      createdAt: message.createdAt,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Portal message POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
