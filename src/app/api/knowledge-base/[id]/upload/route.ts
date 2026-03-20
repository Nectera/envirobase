import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

const KB_BUCKET = "knowledge-base";

/**
 * Extract text content from uploaded files so the AI assistant can read them.
 * Supports PDF, plain text, and markdown files.
 */
async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    // Plain text / markdown — just decode the buffer
    if (mimeType === "text/plain" || mimeType === "text/markdown") {
      return buffer.toString("utf-8").trim();
    }

    // PDF — use pdf-parse to extract text
    if (mimeType === "application/pdf") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require("pdf-parse");
      const result = await pdfParse(buffer);
      // Limit to ~50K chars to stay within Prisma field limits
      const text = result.text?.trim() || "";
      return text.slice(0, 50000);
    }

    // Images — can't extract text without OCR
    if (mimeType.startsWith("image/")) {
      return "";
    }

    return "";
  } catch (err) {
    console.error("Text extraction failed:", err);
    return "";
  }
}

/**
 * POST /api/knowledge-base/[id]/upload
 * Upload a file (PDF, image, docx) to a knowledge base article.
 * Automatically extracts text content from PDFs and text files
 * so the AI assistant can read the content.
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

    // Read file buffer once — used for both upload and text extraction
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
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

    // Extract text from the file for the AI assistant
    const extractedText = await extractTextFromFile(buffer, file.type);

    // Update the KB article record — save extracted text as content if the article
    // doesn't already have meaningful content
    const existingContent = article.content?.trim() || "";
    const hasPlaceholderContent = !existingContent || existingContent === "(See attached file)";
    const shouldUpdateContent = hasPlaceholderContent && extractedText.length > 0;

    const updated = await prisma.knowledgeBase.update({
      where: { id: params.id },
      data: {
        fileUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        ...(shouldUpdateContent && { content: extractedText }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      fileUrl: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      textExtracted: extractedText.length > 0,
      textLength: extractedText.length,
    });
  } catch (error: any) {
    console.error("KB upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
