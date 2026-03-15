import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireOrg();
  if (result instanceof NextResponse) return result;
  const { session, orgId } = result;

  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 });
    }

    // Read file into buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate filename
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `${params.id}.${ext}`;

    // Save to public/uploads/team/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "team");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Remove old photo if exists
    const existingFiles = fs.readdirSync(uploadDir).filter((f) => f.startsWith(params.id));
    for (const f of existingFiles) {
      fs.unlinkSync(path.join(uploadDir, f));
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    // Update worker record
    const photoUrl = `/uploads/team/${filename}?t=${Date.now()}`;
    await prisma.worker.update({
      where: orgWhere(orgId, { id: params.id }),
      data: { photoUrl },
    });

    return NextResponse.json({ photoUrl });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
