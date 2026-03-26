import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendNotificationToUser, buildNoteMentionBody, resolveEntityLabel } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/notes?entityType=project&entityId=xxx  OR  ?global=true  OR  ?all=true
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const organizationId = user.organizationId;

    const entityType = req.nextUrl.searchParams.get("entityType");
    const entityId = req.nextUrl.searchParams.get("entityId");
    const global = req.nextUrl.searchParams.get("global");
    const all = req.nextUrl.searchParams.get("all");
    const pinnedOnly = req.nextUrl.searchParams.get("pinnedOnly");

    const where: any = {};

    // Multi-tenancy: scope to org
    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (global === "true") {
      where.entityType = null;
      where.entityId = null;
    } else if (entityType && entityId) {
      where.entityType = entityType;
      where.entityId = entityId;
    } else if (all === "true") {
      // All notes for the org
    } else {
      return NextResponse.json({ error: "Provide entityType+entityId, global=true, or all=true" }, { status: 400 });
    }

    // Visibility filter: show team notes + user's own private notes
    const userId = user.id;
    where.OR = [
      { visibility: "team" },
      { visibility: "private", createdById: userId },
    ];

    if (pinnedOnly === "true") {
      where.isPinned = true;
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [
        { isPinned: "desc" },
        { updatedAt: "desc" },
      ],
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("GET /api/notes error:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

// POST /api/notes — create a new note
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, color, isPinned, visibility, entityType, entityId, mentions } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const user = session.user as any;

    const note = await prisma.note.create({
      data: {
        title: title || null,
        content,
        color: color || "default",
        isPinned: isPinned || false,
        visibility: visibility || "team",
        entityType: entityType || null,
        entityId: entityId || null,
        mentions: mentions ? JSON.stringify(mentions) : null,
        createdById: user.id,
        createdByName: user.name || user.email,
        organizationId: user.organizationId || null,
      },
      include: {
        comments: true,
      },
    });

    // Create notifications for mentioned users
    if (mentions?.length) {
      const mentionedIds: string[] = Array.isArray(mentions) ? mentions : JSON.parse(mentions);
      const isAll = mentionedIds.includes("__all__") || mentionedIds.includes("all");

      // If @all, notify every user in the org except the sender
      const targetIds = isAll
        ? (await prisma.user.findMany({
            where: { organizationId: user.organizationId || undefined, id: { not: user.id } },
            select: { id: true },
          })).map((u: any) => u.id)
        : mentionedIds.filter((id: string) => id !== user.id);

      const fromName = user.name || user.email;
      const link = entityType && entityId ? `/${entityType}s/${entityId}` : null;
      const entityLabel = await resolveEntityLabel(entityType || null, entityId || null);
      const onCtx = entityLabel ? ` (${entityLabel})` : "";

      for (const mentionedUserId of targetIds) {
        try {
          await prisma.notification.create({
            data: {
              type: "mention",
              title: isAll ? "Team note posted" : "You were mentioned in a note",
              message: title
                ? `${fromName} ${isAll ? "posted a note to everyone" : `mentioned you`} in "${title}"${onCtx}`
                : `${fromName} ${isAll ? "posted a note to everyone" : "mentioned you in a note"}${onCtx}`,
              link,
              userId: mentionedUserId,
              fromUserId: user.id,
              fromName,
              organizationId: user.organizationId || null,
            },
          });
        } catch (e) {
          console.error("Failed to create mention notification:", e);
        }

        // Fire-and-forget email notification
        const emailSubject = title
          ? `${fromName} mentioned you in "${title}"${onCtx}`
          : `${fromName} mentioned you in a note${onCtx}`;
        const emailBody = buildNoteMentionBody(fromName, title || null, content, "note", link, entityLabel);
        sendNotificationToUser(mentionedUserId, "noteMention", emailSubject, emailBody).catch(() => {});
      }
    }

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("POST /api/notes error:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
