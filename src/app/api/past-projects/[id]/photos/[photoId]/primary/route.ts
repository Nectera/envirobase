import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    // Verify project belongs to org
    const project = await prisma.pastProject.findFirst({
      where: { id: params.id, ...orgWhere(orgId) },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const photo = await prisma.projectPhoto.findUnique({ where: { id: params.photoId } });
    if (!photo || photo.pastProjectId !== params.id) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Clear all, then set this one
    await prisma.projectPhoto.updateMany({
      where: { pastProjectId: params.id },
      data: { isPrimary: false },
    });
    await prisma.projectPhoto.update({
      where: { id: params.photoId },
      data: { isPrimary: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Set primary photo error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
