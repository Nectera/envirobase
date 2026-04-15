import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

const TEAM_PHOTOS_BUCKET = "team-photos";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireOrg();
  if (result instanceof NextResponse) return result;
  const { session, orgId } = result;

  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 });
    }

    // Read file into buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate filename
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `${params.id}.${ext}`;

    // Delete any existing photo for this worker (different extension)
    const { data: existingFiles } = await supabase.storage
      .from(TEAM_PHOTOS_BUCKET)
      .list("", { search: params.id });

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map((f) => f.name);
      await supabase.storage.from(TEAM_PHOTOS_BUCKET).remove(filesToRemove);
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(TEAM_PHOTOS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(TEAM_PHOTOS_BUCKET)
      .getPublicUrl(storagePath);

    const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update worker record
    await prisma.worker.update({
      where: orgWhere(orgId, { id: params.id }),
      data: { photoUrl },
    });

    return NextResponse.json({ photoUrl });
  } catch (error: any) {
    console.error("Worker photo upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
