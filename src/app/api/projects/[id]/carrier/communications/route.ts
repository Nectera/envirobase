import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST — log a new communication
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const body = await req.json();
    const { carrierId, type, direction, subject, body: commBody, contactName, date } = body;

    if (!carrierId || !type || !direction || !subject) {
      return NextResponse.json({ error: "carrierId, type, direction, subject required" }, { status: 400 });
    }

    const comm = await prisma.carrierCommunication.create({
      data: {
        carrierId,
        type,
        direction,
        subject,
        body: commBody || null,
        contactName: contactName || null,
        date: date || null,
      },
    });

    // Log activity
    const userName = (session.user as any)?.name || (session.user as any)?.email || "Unknown";
    try {
      const carrier = await prisma.carrierInfo.findUnique({ where: { id: carrierId }, select: { carrierName: true } });
      await prisma.activity.create({
        data: orgData(orgId, {
          parentType: "project",
          parentId: params.id,
          type: "note",
          content: `Logged ${direction} ${type} with ${carrier?.carrierName || "carrier"}: ${subject}`,
          user: userName,
        }),
      });
    } catch {}

    return NextResponse.json(comm, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
