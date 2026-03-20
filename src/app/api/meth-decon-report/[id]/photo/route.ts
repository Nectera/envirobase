import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";

/**
 * DELETE /api/meth-decon-report/[id]/photo
 * Remove a photo from a meth decon report and delete from storage.
 * Body: { photoUrl: string, type?: "waste_manifest" | "project_photo" }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { photoUrl } = await req.json();
    if (!photoUrl) {
      return NextResponse.json({ error: "photoUrl is required" }, { status: 400 });
    }

    const report = await prisma.methDeconReport.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Remove photo from both arrays (check both since caller might not specify type)
    const wastePhotos = (report.wasteManifestPhotos as any[]) || [];
    const projectPhotos = (report.projectPhotos as any[]) || [];

    const updatedWaste = wastePhotos.filter(
      (p: any) => (typeof p === "string" ? p : p.url) !== photoUrl
    );
    const updatedProject = projectPhotos.filter(
      (p: any) => (typeof p === "string" ? p : p.url) !== photoUrl
    );

    await prisma.methDeconReport.update({
      where: { id: params.id },
      data: {
        wasteManifestPhotos: updatedWaste,
        projectPhotos: updatedProject,
      },
    });

    // Try to delete from Supabase Storage
    try {
      const url = new URL(photoUrl);
      const pathMatch = url.pathname.match(/\/object\/public\/[^/]+\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([pathMatch[1]]);
      }
    } catch {
      // Non-critical — photo record already removed from DB
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Photo delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
