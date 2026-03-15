import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";

/**
 * DELETE /api/projects/[id]/documents/[docId]
 * Delete a document record and optionally remove the file from Supabase Storage.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Find the document
    const doc = await prisma.document.findUnique({ where: { id: params.docId } });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Remove file from Supabase Storage if a storagePath was saved
    const storagePath = (doc as any).data?.storagePath;
    if (storagePath) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    }

    // Delete the document record
    await prisma.document.delete({ where: { id: params.docId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Document delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
