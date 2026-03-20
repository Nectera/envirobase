import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

const KB_BUCKET = "knowledge-base";

/**
 * POST /api/knowledge-base/[id]/upload
 * Upload a file (PDF, image, docx) to a knowledge base article.
 * Creates the storage bucket if it doesn't exist.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = session.user.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const userId = session.user.id;
    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (25 MB max for documents)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }

    // Validate file type
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Please upload a PDF, image, Word doc, or text file." },
        { status: 400 }
      );
    }

    // Verify article exists and belongs to this org
    const article = await prisma.knowledgeBase.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Generate storage path
    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `articles/${params.id}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    let { data, error } = await supabase.storage
      .from(KB_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    // If bucket doesn't exist, create it and retry
    if (error && (error.message?.includes("not found") || error.message?.includes("Bucket") || (error as any).statusCode === 404)) {
      await supabase.storage.createBucket(KB_BUCKET, { public: true });
      const retry = await supabase.storage
        .from(KB_BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("KB upload error:", error);
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(KB_BUCKET)
      .getPublicUrl(data!.path);

    const publicUrl = urlData.publicUrl;

    // Update the KB article record
    const updated = await prisma.knowledgeBase.update({
      where: { id: params.id },
      data: {
        fileUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json({
      id: updated.id,
      fileUrl: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    console.error("KB upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
