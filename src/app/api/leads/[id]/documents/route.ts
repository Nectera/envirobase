import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const docs = await prisma.leadDocument.findMany({ where: orgWhere(orgId, { leadId: params.id }) });
    return NextResponse.json(docs);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    // LeadDocument schema only has: name, fileName, fileUrl, fileSize, mimeType, docType, data
    // Store extra fields (title, referenceNumber, notes, status, etc.) in the data JSON column
    const extraData: any = {};
    if (body.title) extraData.title = body.title;
    if (body.referenceNumber) extraData.referenceNumber = body.referenceNumber;
    if (body.notes) extraData.notes = body.notes;
    if (body.status) extraData.status = body.status;
    if (body.startDate) extraData.startDate = body.startDate;
    if (body.endDate) extraData.endDate = body.endDate;
    if (body.date) extraData.date = body.date;
    extraData.createdBy = body.createdBy || userId;

    const doc = await prisma.leadDocument.create({
      data: orgData(orgId, {
        leadId: params.id,
        docType: body.docType || "other",
        name: body.title || body.docType || "Document",
        fileName: body.fileName || null,
        fileSize: body.fileSize || null,
        data: Object.keys(extraData).length > 0 ? extraData : null,
      }),
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const { searchParams } = new URL(req.url);
    const docId = searchParams.get("docId");
    if (!docId) {
      return NextResponse.json({ error: "docId required" }, { status: 400 });
    }

    await prisma.leadDocument.delete({ where: orgWhere(orgId, { id: docId }) });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
