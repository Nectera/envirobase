import { NextRequest, NextResponse } from "next/server";
import { pdApiCall, isConnected } from "@/lib/pandadoc";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isConnected())) {
    return NextResponse.json({ error: "PandaDoc not connected" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { subject, message, parentType, parentId, estimateId } = body;

    // Send document for signature
    const sendPayload: any = {};
    if (subject) sendPayload.subject = subject;
    if (message) sendPayload.message = message;

    await pdApiCall("POST", `/documents/${params.id}/send`, sendPayload);

    // Update linked estimate status to "sent"
    if (estimateId) {
      await prisma.estimate.update({
        where: { id: estimateId },
        data: {
          status: "sent",
          sentDate: new Date().toISOString().split("T")[0],
        },
      });
    }

    // Log activity
    if (parentType && parentId) {
      await prisma.activity.create({
        data: {
          parentType,
          parentId,
          type: "document_sent",
          description: `PandaDoc document sent for signature`,
        },
      });
    }

    return NextResponse.json({ sent: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
