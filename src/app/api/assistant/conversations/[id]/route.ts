import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/assistant/conversations/[id] — load conversation messages
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { orgId } = result;

    const conversation = await prisma.assistantConversation.findFirst({
      where: orgWhere(orgId, { id: params.id }),
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Return only user/assistant text messages
    const messages = ((conversation as any).messages || [])
      .filter((m: any) => typeof m.content === "string")
      .map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

    return NextResponse.json({ id: conversation.id, messages });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
