import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { supabase, DFR_PHOTOS_BUCKET } from "@/lib/supabase";

/**
 * POST /api/field-reports/upload
 * Upload a single photo for a daily field report.
 * Accepts formData with:
 *   - file: File (image)
 *   - reportId: string (optional — used for storage path organization)
 *
 * Returns: { url: string, fileName: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const reportId = (formData.get("reportId") as string) || "unsaved";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type — images only
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only image files are allowed (JPEG, PNG, WebP, HEIC)." },
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
    const storagePath = `${reportId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await supabase.storage
      .from(DFR_PHOTOS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error("Supabase DFR photo upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from(DFR_PHOTOS_BUCKET)
      .getPublicUrl(data.path);

    return NextResponse.json(
      { url: urlData.publicUrl, fileName: file.name },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Field report photo upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
