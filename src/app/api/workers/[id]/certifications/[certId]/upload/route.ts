import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { supabase, CERTIFICATIONS_BUCKET } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/workers/[id]/certifications/[certId]/upload
 * Upload a cert document (PDF or image) to Supabase Storage and
 * update the Certification record with the file URL.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; certId: string } }
) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const userId = (session.user as any)?.id || "anonymous";

    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (10 MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Validate file type
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Please upload a PDF or image (JPEG, PNG, WebP)." },
        { status: 400 }
      );
    }

    // Verify certification belongs to the worker
    const cert = await prisma.certification.findFirst({
      where: orgWhere(orgId, { id: params.certId, workerId: params.id }),
    });
    if (!cert) {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }

    // Generate unique storage path
    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `${params.id}/${params.certId}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await supabase.storage
      .from(CERTIFICATIONS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error("Supabase cert upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(CERTIFICATIONS_BUCKET)
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl;

    // Update the certification record
    const updated = await prisma.certification.update({
      where: orgWhere(orgId, { id: params.certId }),
      data: {
        fileUrl: publicUrl,
        fileName: file.name,
      },
    });

    return NextResponse.json({
      id: updated.id,
      fileUrl: publicUrl,
      fileName: file.name,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Cert upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
