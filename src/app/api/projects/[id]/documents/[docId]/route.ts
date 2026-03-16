import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/projects/[id]/documents/[docId]
 * Delete a document record and optionally remove the file from Supabase Storage.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    // Find the document
    const doc = await prisma.document.findUnique({ where: orgWhere(orgId, { id: params.docId }) });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Remove file from Supabase Storage if a storagePath was saved
    const storagePath = (doc as any).data?.storagePath;
    if (storagePath) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    }

    // Delete the document record
    await prisma.document.delete({ where: orgWhere(orgId, { id: params.docId }) });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Document delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
