import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { notifyClientMessage } from "@/lib/portalNotifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/portal/messages
 * Fetch all portal messages for a project (across all active portals).
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: params.id, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get messages from all portals for this project
    const portals = await prisma.customerPortal.findMany({
      where: { projectId: params.id },
      select: { id: true },
    });
    const portalIds = portals.map((p: any) => p.id);

    const messages = await prisma.portalMessage.findMany({
      where: { portalId: { in: portalIds } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error("Portal messages GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/portal/messages
 * Send a message to the client through the portal.
 * Body: { content: string, portalId?: string }
 * If portalId is not provided, sends to the first active portal.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session.user as any)?.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { content, portalId } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: params.id, organizationId: orgId },
      select: { id: true, name: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Find the target portal
    let targetPortal;
    if (portalId) {
      targetPortal = await prisma.customerPortal.findFirst({
        where: { id: portalId, projectId: params.id, active: true },
      });
    } else {
      // Default to first active portal
      targetPortal = await prisma.customerPortal.findFirst({
        where: { projectId: params.id, active: true },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!targetPortal) {
      return NextResponse.json({ error: "No active portal found for this project" }, { status: 404 });
    }

    const senderName = (session.user as any)?.name || (session.user as any)?.email || "Team Member";

    // Create the message
    const message = await prisma.portalMessage.create({
      data: {
        portalId: targetPortal.id,
        sender: senderName,
        isClient: false,
        content: content.trim(),
      },
    });

    // Send email notification to client
    if (orgId) {
      notifyClientMessage(
        params.id,
        orgId,
        project.name,
        senderName,
        content.trim(),
      ).catch(() => {}); // Fire-and-forget
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    console.error("Portal messages POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
