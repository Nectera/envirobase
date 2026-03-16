import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/notes/[id] — update a note
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { id } = params;
    const body = await req.json();

    // Verify the note exists
    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Only the creator or an admin can edit
    if (existing.createdById !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Not authorized to edit this note" }, { status: 403 });
    }

    const { title, content, color, isPinned, visibility, mentions } = body;

    const data: any = {};
    if (title !== undefined) data.title = title || null;
    if (content !== undefined) data.content = content;
    if (color !== undefined) data.color = color;
    if (isPinned !== undefined) data.isPinned = isPinned;
    if (visibility !== undefined) data.visibility = visibility;
    if (mentions !== undefined) data.mentions = mentions ? JSON.stringify(mentions) : null;

    const note = await prisma.note.update({
      where: { id },
      data,
      include: { comments: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("PATCH /api/notes/[id] error:", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

// DELETE /api/notes/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { id } = params;

    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Only the creator or an admin can delete
    if (existing.createdById !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Not authorized to delete this note" }, { status: 403 });
    }

    await prisma.note.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notes/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
