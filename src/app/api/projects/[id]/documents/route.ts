import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawDocs = await prisma.document.findMany({ where: { projectId: params.id } });
    // Flatten data JSON fields onto each doc for frontend compatibility
    const docs = rawDocs.map((d: any) => ({
      ...d,
      ...(d.data && typeof d.data === "object" ? d.data : {}),
    }));
    return NextResponse.json(docs);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    // Store extra fields (startDate, endDate, referenceNumber, notes, status) in data JSON
    const extraData: any = body.data || {};
    if (body.startDate) extraData.startDate = body.startDate;
    if (body.endDate) extraData.endDate = body.endDate;
    if (body.referenceNumber) extraData.referenceNumber = body.referenceNumber;
    if (body.notes) extraData.notes = body.notes;
    if (body.status) extraData.status = body.status;

    const doc = await prisma.document.create({
      data: {
        projectId: params.id,
        docType: body.docType || "other",
        name: body.title || body.name || "",
        fileName: body.fileName || null,
        fileUrl: body.fileUrl || null,
        fileSize: body.fileSize || null,
        mimeType: body.mimeType || null,
        date: body.date || null,
        data: Object.keys(extraData).length > 0 ? extraData : null,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
