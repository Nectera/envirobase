import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";

export const dynamic = "force-dynamic";

/**
 * POST /api/schedule/week
 * Create or update a ScheduleWeek record (upsert on weekStart).
 * Called when the AI scheduler generates a draft schedule.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const userId = (session?.user as any)?.id || null;
    const body = await req.json();
    const { weekStart } = body;

    if (!weekStart) {
      return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
    }

    // Upsert — if already exists, update to pending_approval; otherwise create
    const week = await prisma.scheduleWeek.upsert({
      where: { weekStart },
      update: {
        status: "pending_approval",
        createdBy: userId,
      },
      create: {
        weekStart,
        status: "pending_approval",
        createdBy: userId,
      },
    });

    return NextResponse.json(week, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/schedule/week?weekStart=YYYY-MM-DD
 * Get ScheduleWeek records.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;

    const weekStart = req.nextUrl.searchParams.get("weekStart");

    if (weekStart) {
      const week = await prisma.scheduleWeek.findUnique({ where: { weekStart } });
      return NextResponse.json(week || { status: "none" });
    }

    // Return all schedule weeks
    const weeks = await prisma.scheduleWeek.findMany({
      orderBy: { weekStart: "desc" },
      take: 20,
    });
    return NextResponse.json(weeks);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
