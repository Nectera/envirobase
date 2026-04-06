import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, getGoogleEmail } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

/**
 * GET /api/google-calendar/callback
 * Google redirects here after user consents. Exchanges code for tokens.
 * State contains { userId, orgId } for multi-tenant scoping.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL("/calendar?gcal=denied", req.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL("/calendar?gcal=error", req.url));
    }

    let userId: string;
    let orgId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
      userId = decoded.userId;
      orgId = decoded.orgId;
    } catch {
      return NextResponse.redirect(new URL("/calendar?gcal=error", req.url));
    }

    if (!userId || !orgId) {
      return NextResponse.redirect(new URL("/calendar?gcal=error", req.url));
    }

    const tokens = await exchangeCodeForTokens(code);
    const googleEmail = await getGoogleEmail(tokens.accessToken);

    await prisma.googleCalendarSync.upsert({
      where: { userId },
      create: {
        userId,
        googleEmail,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
        enabled: true,
        organizationId: orgId,
      },
      update: {
        googleEmail,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
        enabled: true,
      },
    });

    return NextResponse.redirect(new URL("/calendar?gcal=connected", req.url));
  } catch (error: any) {
    console.error("Google Calendar callback error:", error);
    return NextResponse.redirect(new URL("/calendar?gcal=error", req.url));
  }
}
