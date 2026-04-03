import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/messages/[id]/star
 * Toggle star on a message for the current user.
 * Returns { starred: boolean }
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const userId = (session.user as any)?.id;

    const existing = await prisma.starredMessage.findUnique({
      where: { messageId_userId: { messageId: params.id, userId } },
    });

    if (existing) {
      await prisma.starredMessage.delete({ where: { id: existing.id } });
      return NextResponse.json({ starred: false });
    } else {
      await prisma.starredMessage.create({
        data: { messageId: params.id, userId, organizationId: orgId },
      });
      return NextResponse.json({ starred: true });
    }
  } catch (error: any) {
    console.error("Star message error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
