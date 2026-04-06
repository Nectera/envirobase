import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/google-calendar/status
 * Check if current user has Google Calendar connected.
 */
export async function GET(_req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const userId = (session.user as any)?.id;

    const sync = await prisma.googleCalendarSync.findUnique({
      where: { userId },
      select: { googleEmail: true, enabled: true, calendarId: true },
    });

    if (!sync) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      enabled: sync.enabled,
      googleEmail: sync.googleEmail,
      calendarId: sync.calendarId,
    });
  } catch (error: any) {
    console.error("Google Calendar status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
