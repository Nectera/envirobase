import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/google-calendar/disconnect
 * Disconnect Google Calendar sync for the current user.
 */
export async function POST(_req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const userId = (session.user as any)?.id;

    const sync = await prisma.googleCalendarSync.findUnique({ where: { userId } });
    if (!sync) {
      return NextResponse.json({ error: "Not connected" }, { status: 404 });
    }

    // Revoke the token at Google (best-effort)
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${sync.refreshToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    } catch { }

    await prisma.googleCalendarSync.delete({ where: { userId } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Google Calendar disconnect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
