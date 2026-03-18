import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";

/**
 * POST /api/meth-decon-report/[id]/upload
 * Upload photos for a meth decon report (waste manifests or project photos)
 * Accept formData with:
 *   - file: File
 *   - type: "waste_manifest" or "project_photo"
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "project_photo";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
        {
          error:
            "File type not allowed. Please upload a PDF or image (JPEG, PNG, WebP).",
        },
        { status: 400 }
      );
    }

    // Validate file size (10 MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    // Validate type parameter
    if (!["waste_manifest", "project_photo"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'waste_manifest' or 'project_photo'." },
        { status: 400 }
      );
    }

    // Verify report exists and belongs to the org
    const report = await prisma.methDeconReport.findUnique({
      where: { id: params.id },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (orgId && report.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Generate unique storage path
    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `meth-decon-reports/${params.id}/${type}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(DOCUMENTS_BUCKET)
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl;

    // Prepare photo object
    const photoObj = {
      url: publicUrl,
      name: file.name,
      uploadedAt: new Date().toISOString(),
    };

    // Update the report's photo array based on type
    let updateData: any = {};

    if (type === "waste_manifest") {
      const current = (report.wasteManifestPhotos as any[]) || [];
      updateData.wasteManifestPhotos = [...current, photoObj];
    } else if (type === "project_photo") {
      const current = (report.projectPhotos as any[]) || [];
      updateData.projectPhotos = [...current, photoObj];
    }

    const updated = await prisma.methDeconReport.update({
      where: { id: params.id },
      data: updateData,
      include: { project: true },
    });

    return NextResponse.json(
      {
        id: updated.id,
        url: publicUrl,
        fileName: file.name,
        type,
        report: updated,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Meth decon report upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
