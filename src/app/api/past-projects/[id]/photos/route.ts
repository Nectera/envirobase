import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { supabase, PAST_PROJECTS_BUCKET } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const project = await prisma.pastProject.findFirst({
      where: { id: params.id, ...orgWhere(orgId) },
    });
    if (!project) return NextResponse.json({ error: "Past project not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    const fileExt = (file.name || "").split(".").pop()?.toLowerCase() || "";
    const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    const typeOk = ALLOWED_TYPES.includes(file.type) || file.type.startsWith("image/");
    const extOk = ALLOWED_EXTS.includes(fileExt);
    if (!typeOk && !extOk) {
      return NextResponse.json({ error: "Only image files are allowed (JPEG, PNG, WebP, HEIC)." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `${params.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from(PAST_PROJECTS_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });

    if (error) {
      console.error("Supabase past project photo upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(PAST_PROJECTS_BUCKET).getPublicUrl(data.path);

    const photo = await prisma.projectPhoto.create({
      data: {
        pastProjectId: params.id,
        url: urlData.publicUrl,
        caption: (formData.get("caption") as string) || null,
        isPrimary: (formData.get("isPrimary") as string)?.toLowerCase() === "true" || false,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error: any) {
    console.error("Past project photo upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
