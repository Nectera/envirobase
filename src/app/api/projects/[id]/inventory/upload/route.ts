import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { supabase, INVENTORY_BUCKET } from "@/lib/supabase";

/**
 * POST /api/projects/[id]/inventory/upload
 * Upload a photo to Supabase Storage for content inventory.
 * Expects FormData with "file" field and optional "itemId" field.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any)?.id;

    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const itemId = formData.get("itemId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only image files are allowed (JPEG, PNG, WebP, HEIC)" },
        { status: 400 }
      );
    }

    // Generate unique path
    const ext = file.name.split(".").pop() || "jpg";
    const uniqueId = crypto.randomUUID();
    const storagePath = `${params.id}/${itemId || "pending"}/${Date.now()}-${uniqueId}.${ext}`;

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await supabase.storage
      .from(INVENTORY_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(INVENTORY_BUCKET)
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl;

    // If itemId provided, create the photo record
    if (itemId) {
      await prisma.contentInventoryPhoto.create({
        data: {
          itemId,
          url: publicUrl,
          fileName: file.name,
          fileSize: file.size,
        },
      });
    }

    return NextResponse.json({
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      path: data.path,
    });
  } catch (error: any) {
    console.error("Inventory upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
