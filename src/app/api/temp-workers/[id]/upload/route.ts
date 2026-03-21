import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { supabase, CERTIFICATIONS_BUCKET } from "@/lib/supabase";

type TempDoc = {
  url: string;
  fileName: string;
  type: string; // "certification" | "id" | "other"
  uploadedAt: string;
};

/**
 * POST /api/temp-workers/[id]/upload
 * Upload a photo of a certification or ID for a temp worker.
 * Accepts formData with:
 *   - file: File (image or PDF)
 *   - type: string ("certification" | "id" | "other")
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id: workerId } = await params;

    // Verify temp worker exists and belongs to this org
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker || !worker.isTemp || worker.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Temp worker not found" },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("type") as string) || "other";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Allow images and PDFs
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "application/pdf",
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only image files and PDFs are allowed." },
        { status: 400 }
      );
    }

    // 10 MB max
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `temp-workers/${workerId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await supabase.storage
      .from(CERTIFICATIONS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error("Supabase temp worker upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from(CERTIFICATIONS_BUCKET)
      .getPublicUrl(data.path);

    // Append to the worker's tempDocuments JSON array
    const existing: TempDoc[] = (worker as any).tempDocuments as TempDoc[] || [];
    const newDoc: TempDoc = {
      url: urlData.publicUrl,
      fileName: file.name,
      type: docType,
      uploadedAt: new Date().toISOString(),
    };

    await prisma.worker.update({
      where: { id: workerId },
      data: { tempDocuments: [...existing, newDoc] as any },
    });

    return NextResponse.json(newDoc, { status: 200 });
  } catch (error: any) {
    console.error("Temp worker document upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/temp-workers/[id]/upload
 * Remove a document from a temp worker by URL.
 * Body: { url: string }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const { id: workerId } = await params;
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker || !worker.isTemp || worker.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Temp worker not found" },
        { status: 404 }
      );
    }

    const existing: TempDoc[] = (worker as any).tempDocuments as TempDoc[] || [];
    const updated = existing.filter((d) => d.url !== url);

    await prisma.worker.update({
      where: { id: workerId },
      data: { tempDocuments: updated as any },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Temp worker document delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
