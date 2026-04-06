import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { supabase, CHAT_BUCKET } from "@/lib/supabase";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "image/heic", "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];

// Some browsers report HEIC files with empty or application/octet-stream MIME type
const EXT_TO_MIME: Record<string, string> = {
  heic: "image/heic",
  heif: "image/heif",
};

/**
 * POST /api/chat/upload
 * Upload a file for chat to Supabase Storage.
 * Accepts FormData with a "file" field.
 */
export async function POST(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const userId = (session.user as any)?.id;

    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }

    // Determine effective MIME type (fallback to extension for HEIC etc.)
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    let effectiveType = file.type;
    if (!effectiveType || effectiveType === "application/octet-stream") {
      effectiveType = EXT_TO_MIME[ext] || file.type;
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(effectiveType)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    // Convert HEIC/HEIF to JPEG so all browsers can display them
    let buffer = Buffer.from(await file.arrayBuffer());
    let uploadType = effectiveType;
    let uploadExt = ext;
    if (effectiveType === "image/heic" || effectiveType === "image/heif") {
      try {
        buffer = await sharp(buffer).jpeg({ quality: 85 }).toBuffer() as Buffer<ArrayBuffer>;
        uploadType = "image/jpeg";
        uploadExt = "jpg";
      } catch (convErr) {
        console.error("HEIC conversion failed:", convErr);
        return NextResponse.json({ error: "Failed to process HEIC image" }, { status: 500 });
      }
    }

    // Generate unique storage path
    const uniqueId = crypto.randomUUID();
    const storagePath = `${userId || "anon"}/${Date.now()}-${uniqueId}.${uploadExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(CHAT_BUCKET)
      .upload(storagePath, buffer, {
        contentType: uploadType,
        upsert: false,
      });

    if (error) {
      console.error("Supabase chat upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(CHAT_BUCKET)
      .getPublicUrl(data.path);

    return NextResponse.json({
      fileUrl: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileMimeType: uploadType,
    });
  } catch (error: any) {
    console.error("Chat upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
