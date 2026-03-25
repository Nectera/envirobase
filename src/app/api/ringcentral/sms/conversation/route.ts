import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/ringcentral/sms/conversation?parentType=lead&parentId=xyz
// or ?phoneNumber=+15551234567
export async function GET(request: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;

  const parentType = request.nextUrl.searchParams.get("parentType");
  const parentId = request.nextUrl.searchParams.get("parentId");
  const phoneNumber = request.nextUrl.searchParams.get("phoneNumber");
  const cursor = request.nextUrl.searchParams.get("cursor");
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "50"), 100);

  try {
    let where: any = {};

    if (parentType && parentId) {
      where = { parentType, parentId };
    } else if (phoneNumber) {
      // Find messages to/from this phone number
      const cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, "");
      where = {
        OR: [
          { fromNumber: { contains: cleaned } },
          { toNumber: { contains: cleaned } },
        ],
      };
    } else {
      return NextResponse.json({ error: "parentType+parentId or phoneNumber required" }, { status: 400 });
    }

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const messages = await prisma.smsMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return NextResponse.json({
      messages: results.map((m: any) => ({
        id: m.id,
        direction: m.direction,
        fromNumber: m.fromNumber,
        toNumber: m.toNumber,
        body: m.body,
        status: m.status,
        senderName: m.senderName,
        createdAt: m.createdAt,
      })),
      nextCursor,
    });
  } catch (error: any) {
    console.error("SMS conversation fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
