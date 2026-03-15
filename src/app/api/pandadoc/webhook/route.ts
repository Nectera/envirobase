import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const events = await req.json();

    // PandaDoc sends events as an array
    const eventList = Array.isArray(events) ? events : [events];

    for (const event of eventList) {
      const { data } = event;
      if (!data?.id) continue;

      const pandadocId = data.id;
      const status = data.status;
      const docName = data.name || "Document";

      // Find the estimate linked to this PandaDoc document
      const estimates = await prisma.estimate.findMany({});
      const linkedEstimate = estimates.find(
        (e: any) => e.pandadocDocumentId === pandadocId
      );

      if (!linkedEstimate) continue;

      const parentType = "estimate";
      const parentId = linkedEstimate.id;

      // Handle different status changes
      if (status === "document.viewed") {
        await prisma.activity.create({
          data: {
            parentType,
            parentId,
            type: "document_viewed",
            description: `PandaDoc document "${docName}" was viewed by recipient`,
          },
        });
      } else if (status === "document.completed") {
        await prisma.activity.create({
          data: {
            parentType,
            parentId,
            type: "document_signed",
            description: `PandaDoc document "${docName}" was signed`,
          },
        });
        // Update estimate status to accepted
        await prisma.estimate.update({
          where: { id: linkedEstimate.id },
          data: {
            status: "accepted",
            acceptedDate: new Date().toISOString().split("T")[0],
          },
        });
      } else if (status === "document.rejected" || status === "document.declined") {
        await prisma.activity.create({
          data: {
            parentType,
            parentId,
            type: "document_rejected",
            description: `PandaDoc document "${docName}" was rejected`,
          },
        });
        // Update estimate status to rejected
        await prisma.estimate.update({
          where: { id: linkedEstimate.id },
          data: {
            status: "rejected",
            rejectedDate: new Date().toISOString().split("T")[0],
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Always return 200 to prevent PandaDoc from disabling the webhook
    return NextResponse.json({ ok: true });
  }
}
