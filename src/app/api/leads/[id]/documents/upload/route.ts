import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/[id]/documents/upload
 * Upload a file to Supabase Storage and create a LeadDocument record.
 * Expects FormData with "file" field, optional "docType", "title", "referenceNumber", "notes".
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const userId = (session.user as any)?.id;

    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("docType") as string) || "other";
    const title = (formData.get("title") as string) || "";
    const referenceNumber = (formData.get("referenceNumber") as string) || "";
    const notes = (formData.get("notes") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (25 MB max)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }

    // Generate unique path
    const ext = file.name.split(".").pop() || "bin";
    const uniqueId = crypto.randomUUID();
    const storagePath = `leads/${params.id}/${docType}/${Date.now()}-${uniqueId}.${ext}`;

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
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
      .from(DOCUMENTS_BUCKET)
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl;

    // Build extra data JSON
    const extraData: any = { storagePath: data.path, createdBy: userId };
    if (title) extraData.title = title;
    if (referenceNumber) extraData.referenceNumber = referenceNumber;
    if (notes) extraData.notes = notes;
    extraData.status = "received";

    // Create LeadDocument record
    const doc = await prisma.leadDocument.create({
      data: orgData(orgId, {
        leadId: params.id,
        docType,
        name: title || file.name,
        fileName: file.name,
        fileUrl: publicUrl,
        fileSize: file.size,
        mimeType: file.type,
        data: extraData,
      }),
    });

    return NextResponse.json({
      id: doc.id,
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      docType,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Lead document upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
