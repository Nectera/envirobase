import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/notes/[id]/comments
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const comments = await prisma.noteComment.findMany({
      where: { noteId: params.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("GET /api/notes/[id]/comments error:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

// POST /api/notes/[id]/comments — add a comment to a note
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const body = await req.json();
    const { content, mentions } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Verify note exists
    const note = await prisma.note.findUnique({ where: { id: params.id } });
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const comment = await prisma.noteComment.create({
      data: {
        noteId: params.id,
        content,
        mentions: mentions ? JSON.stringify(mentions) : null,
        createdById: user.id,
        createdByName: user.name || user.email,
      },
    });

    // Notify note creator about the new comment (if it's not their own comment)
    if (note.createdById !== user.id) {
      try {
        await prisma.notification.create({
          data: {
            type: "mention",
            title: "New comment on your note",
            message: note.title
              ? `${user.name || user.email} commented on "${note.title}"`
              : `${user.name || user.email} commented on your note`,
            link: note.entityType && note.entityId ? `/${note.entityType}s/${note.entityId}` : null,
            userId: note.createdById,
            fromUserId: user.id,
            fromName: user.name || user.email,
            organizationId: note.organizationId || null,
          },
        });
      } catch (e) {
        console.error("Failed to create comment notification:", e);
      }
    }

    // Notify mentioned users in the comment
    if (mentions?.length) {
      const mentionedIds: string[] = Array.isArray(mentions) ? mentions : JSON.parse(mentions);
      for (const mentionedUserId of mentionedIds) {
        if (mentionedUserId === user.id) continue;
        try {
          await prisma.notification.create({
            data: {
              type: "mention",
              title: "You were mentioned in a comment",
              message: `${user.name || user.email} mentioned you in a note comment`,
              link: note.entityType && note.entityId ? `/${note.entityType}s/${note.entityId}` : null,
              userId: mentionedUserId,
              fromUserId: user.id,
              fromName: user.name || user.email,
              organizationId: note.organizationId || null,
            },
          });
        } catch (e) {
          console.error("Failed to create mention notification:", e);
        }
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("POST /api/notes/[id]/comments error:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
