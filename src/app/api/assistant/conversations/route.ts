import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/assistant/conversations — list recent conversations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await prisma.assistantConversation.findMany();

    // Return summaries — first user message as preview, timestamp
    const summaries = conversations.slice(0, 20).map((c: any) => {
      const msgs = c.messages || [];
      const firstUserMsg = msgs.find((m: any) => m.role === "user");
      const preview = firstUserMsg?.content?.slice(0, 80) || "New conversation";
      const messageCount = msgs.length;
      return {
        id: c.id,
        preview,
        messageCount,
        updatedAt: c.updatedAt || c.createdAt,
      };
    });

    return NextResponse.json({ conversations: summaries });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/assistant/conversations?id=xxx — delete a conversation
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
    }

    await prisma.assistantConversation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
