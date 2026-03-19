import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { invalidateOrgBrandingCache } from "@/lib/org-branding";

export const dynamic = "force-dynamic";

const LOGO_BUCKET = "content-inventory";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/svg+xml", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const role = (session.user as any)?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("logo") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Only PNG, JPG, SVG, and WebP files are allowed" }, { status: 400 });

    const ext = file.name.split(".").pop() || "png";
    const storagePath = `logos/${orgId}/logo-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });

    if (error) {
      console.error("Logo upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(data.path);

    await prisma.organization.update({
      where: { id: orgId },
      data: { logoUrl: urlData.publicUrl },
    });

    invalidateOrgBrandingCache(orgId);
    return NextResponse.json({ logoUrl: urlData.publicUrl });
  } catch (error: any) {
    console.error("Logo upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
