import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { notifyClientPortalCreated } from "@/lib/portalNotifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/portal
 * Fetch existing portal link(s) for a project.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const portals = await prisma.customerPortal.findMany({
      where: { projectId: params.id },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 5 },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(portals);
  } catch (error: any) {
    console.error("Portal GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/portal
 * Generate a new customer portal link for a project.
 * Uses the project's client name/email if available.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = (session.user as any)?.role;
    if (!["ADMIN", "PROJECT_MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get project to pre-fill client info
    const project = await prisma.project.findUnique({
      where: orgWhere(orgId, { id: params.id }),
      select: { id: true, client: true, clientEmail: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if an active portal already exists
    const existing = await prisma.customerPortal.findFirst({
      where: { projectId: params.id, active: true },
    });

    if (existing) {
      return NextResponse.json({
        ...existing,
        alreadyExists: true,
      });
    }

    const portal = await prisma.customerPortal.create({
      data: {
        projectId: project.id,
        clientName: project.client || null,
        clientEmail: project.clientEmail || null,
        createdBy: (session.user as any)?.name || (session.user as any)?.email || "unknown",
      },
    });

    // Send portal access email to client
    if (project.clientEmail && orgId) {
      // Get project name for the email
      const fullProject = await prisma.project.findUnique({
        where: { id: params.id },
        select: { name: true },
      });
      notifyClientPortalCreated(
        params.id,
        orgId,
        fullProject?.name || "Your Project",
        project.clientEmail,
        portal.token,
      ).catch(() => {}); // Fire-and-forget
    }

    return NextResponse.json(portal, { status: 201 });
  } catch (error: any) {
    console.error("Portal POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/portal
 * Deactivate a portal link.
 * Body: { portalId: string, active: boolean }
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = (session.user as any)?.role;
    if (!["ADMIN", "PROJECT_MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { portalId, active } = body;

    if (!portalId) {
      return NextResponse.json({ error: "portalId required" }, { status: 400 });
    }

    const portal = await prisma.customerPortal.update({
      where: { id: portalId },
      data: { active: active ?? false },
    });

    return NextResponse.json(portal);
  } catch (error: any) {
    console.error("Portal PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
