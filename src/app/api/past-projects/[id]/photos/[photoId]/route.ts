import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { supabase, PAST_PROJECTS_BUCKET } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    // Verify project belongs to org
    const project = await prisma.pastProject.findFirst({
      where: { id: params.id, ...orgWhere(orgId) },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const photo = await prisma.projectPhoto.findUnique({ where: { id: params.photoId } });
    if (!photo || photo.pastProjectId !== params.id) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Try to delete from storage (extract path from URL)
    try {
      const url = new URL(photo.url);
      const pathMatch = url.pathname.match(/\/object\/public\/[^/]+\/(.+)/);
      if (pathMatch?.[1]) {
        await supabase.storage.from(PAST_PROJECTS_BUCKET).remove([decodeURIComponent(pathMatch[1])]);
      }
    } catch { /* ignore storage deletion errors */ }

    await prisma.projectPhoto.delete({ where: { id: params.photoId } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Photo deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
