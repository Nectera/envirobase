import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

/**
 * GET /api/reactions?targetType=message&targetId=xxx
 * Fetch all reactions for a target (message or activity).
 * Also supports batch: ?targetType=message&targetIds=id1,id2,id3
 */
export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");
    const targetIds = searchParams.get("targetIds");

    if (!targetType) return NextResponse.json({ error: "targetType required" }, { status: 400 });

    // Batch mode: fetch reactions for multiple targets at once
    if (targetIds) {
      const ids = targetIds.split(",").filter(Boolean);
      const reactions = await prisma.reaction.findMany({
        where: { targetType, targetId: { in: ids } },
        orderBy: { createdAt: "asc" },
      });

      // Group by targetId
      const grouped: Record<string, any[]> = {};
      for (const r of reactions as any[]) {
        if (!grouped[r.targetId]) grouped[r.targetId] = [];
        grouped[r.targetId].push(r);
      }
      return NextResponse.json(grouped);
    }

    // Single target mode
    if (!targetId) return NextResponse.json({ error: "targetId or targetIds required" }, { status: 400 });

    const reactions = await prisma.reaction.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(reactions);
  } catch (error: any) {
    console.error("Reactions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/reactions
 * Toggle a reaction (add if not exists, remove if exists).
 * Body: { targetType, targetId, emoji }
 */
export async function POST(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const userId = (session.user as any)?.id;
    const userName = (session.user as any)?.name || "User";

    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { targetType, targetId, emoji } = body;

    if (!targetType || !targetId || !emoji) {
      return NextResponse.json({ error: "targetType, targetId, and emoji are required" }, { status: 400 });
    }

    // Toggle: check if reaction already exists
    const existing = await prisma.reaction.findUnique({
      where: {
        targetType_targetId_userId_emoji: { targetType, targetId, userId, emoji },
      },
    });

    if (existing) {
      // Remove reaction
      await prisma.reaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed" });
    }

    // Add reaction
    const reaction = await prisma.reaction.create({
      data: { targetType, targetId, userId, userName, emoji },
    });

    return NextResponse.json({ action: "added", reaction }, { status: 201 });
  } catch (error: any) {
    console.error("Reactions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
