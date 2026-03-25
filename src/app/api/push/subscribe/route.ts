import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org-context";

/**
 * POST /api/push/subscribe
 * Register a push subscription for the current user.
 * Body: { endpoint, keys: { p256dh, auth }, userAgent? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;
    const userId = (session.user as any)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { endpoint, keys, userAgent } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
    }

    // Upsert by endpoint (a device can only have one subscription)
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
      },
    });

    // Auto-enable push in preferences if not already set
    await prisma.notificationPreference.upsert({
      where: { userId },
      update: { pushEnabled: true },
      create: {
        userId,
        pushEnabled: true,
      },
    });

    return NextResponse.json({ id: sub.id, success: true });
  } catch (error: any) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe
 * Unregister a push subscription.
 * Body: { endpoint }
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
