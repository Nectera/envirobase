import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/storage/signed-upload-url
 * Generate a signed upload URL for direct browser-to-Supabase uploads.
 * This bypasses Vercel's serverless function body size limit (4.5MB).
 *
 * Body: { fileName: string, contentType: string, bucket?: string, path: string }
 * Returns: { signedUrl: string, path: string, token: string }
 */
export async function POST(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session } = result;
    const userId = (session.user as any)?.id;

    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { contentType, path } = body;
    const bucket = body.bucket || DOCUMENTS_BUCKET;

    if (!path || !contentType) {
      return NextResponse.json({ error: "path and contentType are required" }, { status: 400 });
    }

    // Create a signed URL for uploading (valid for 5 minutes)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error) {
      console.error("Signed URL error:", error);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    // Get the public URL for after upload completes
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: urlData.publicUrl,
    });
  } catch (error: any) {
    console.error("Signed upload URL error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
