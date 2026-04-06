import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

/**
 * GET /api/google-calendar/connect
 * Redirects the user to Google's OAuth consent screen.
 * Encodes userId + orgId in state so callback can link tokens.
 */
export async function GET(_req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const state = Buffer.from(JSON.stringify({ userId, orgId })).toString("base64url");
    const authUrl = getGoogleAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Google Calendar connect error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
