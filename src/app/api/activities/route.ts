import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const parentType = req.nextUrl.searchParams.get("parentType") || "";
    const parentId = req.nextUrl.searchParams.get("parentId") || "";
    const linkedIds = req.nextUrl.searchParams.get("linkedIds") || "";

    // Build list of IDs to query (supports cross-linked activity feeds)
    const ids: string[] = [];
    if (parentId) ids.push(parentId);
    if (linkedIds) {
      linkedIds.split(",").forEach((id) => {
        const trimmed = id.trim();
        if (trimmed) ids.push(trimmed);
      });
    }

    let activities;
    if (ids.length > 1) {
      // Cross-linked query: fetch activities for multiple parentIds
      activities = await prisma.activity.findMany({
        where: { ...orgWhere(orgId), parentId: { in: ids } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    } else {
      const where: any = { ...orgWhere(orgId) };
      if (parentType) where.parentType = parentType;
      if (parentId) where.parentId = parentId;
      activities = await prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }

    // Map content → description for frontend compatibility
    const mapped = activities.map((a: any) => ({
      ...a,
      description: a.content || a.description || "",
    }));
    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    const content = body.content || body.title || body.description || "";

    const activity = await prisma.activity.create({
      data: orgData(orgId, {
        parentType: body.parentType,
        parentId: body.parentId,
        type: body.type || "note",
        content,
        user: body.userId || body.user || "system",
      }),
    });

    // Parse @mentions and create notifications
    // mentions come as array of { id, name } from the frontend
    const mentions: { id: string; name: string }[] = body.mentions || [];
    if (mentions.length > 0) {
      const fromName = (session.user as any)?.name || "Someone";

      // Build link based on parentType
      const linkMap: Record<string, string> = {
        lead: `/leads/${body.parentId}`,
        project: `/projects/${body.parentId}`,
        company: `/companies/${body.parentId}`,
        contact: `/contacts/${body.parentId}`,
        estimate: `/estimates/${body.parentId}`,
      };
      const link = linkMap[body.parentType] || "";

      // Look up each mentioned worker's userId
      const workers = await prisma.worker.findMany({
        where: { ...orgWhere(orgId), id: { in: mentions.map((m) => m.id) } },
        select: { id: true, userId: true, name: true },
      });

      const notifications = workers
        .filter((w: any) => w.userId) // Only notify workers with linked user accounts
        .map((w: any) => ({
          type: "mention",
          title: `${fromName} mentioned you in a ${body.type || "note"}`,
          message: content.length > 120 ? content.slice(0, 120) + "..." : content,
          link,
          userId: w.userId!,
          fromUserId: userId,
          fromName,
        }));

      if (notifications.length > 0) {
        await prisma.notification.createMany({ data: notifications });
      }
    }

    return NextResponse.json(activity, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
