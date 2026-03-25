import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { rcApiCall, isConnected } from "@/lib/ringcentral";
import { logger } from "@/lib/logger";
import { APP_DOMAIN } from "@/lib/branding";

export const dynamic = "force-dynamic";

// GET — list active webhook subscriptions
export async function GET() {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session } = auth;

  // Only admins can manage webhooks
  if ((session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    if (!(await isConnected())) {
      return NextResponse.json({ error: "RingCentral not connected. Connect first via Settings." }, { status: 503 });
    }

    const result = await rcApiCall("GET", "/subscription");
    const webhooks = (result.records || []).filter(
      (sub: any) => sub.deliveryMode?.transportType === "WebHook"
    );

    return NextResponse.json({
      subscriptions: webhooks.map((sub: any) => ({
        id: sub.id,
        status: sub.status,
        address: sub.deliveryMode?.address,
        expiresAt: sub.expirationTime,
        eventFilters: sub.eventFilters,
        createdAt: sub.creationTime,
      })),
    });
  } catch (error: any) {
    logger.error("Webhook list error", { error: error.message });
    return NextResponse.json({ error: error.message || "Failed to list subscriptions" }, { status: 500 });
  }
}

// POST — create the webhook subscription for SMS + call recordings
export async function POST(request: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session } = auth;

  if ((session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    if (!(await isConnected())) {
      return NextResponse.json({ error: "RingCentral not connected. Connect first via Settings." }, { status: 503 });
    }

    // Allow custom webhook URL or default to production
    const body = await request.json().catch(() => ({}));
    const webhookUrl = body.webhookUrl || `${process.env.NEXTAUTH_URL || `https://${APP_DOMAIN}`}/api/ringcentral/webhook`;

    // Try different filter combinations — RC permissions vary by account
    const filterSets = [
      // Full set: SMS + call log
      [
        "/restapi/v1.0/account/~/extension/~/message-store/instant?type=SMS",
        "/restapi/v1.0/account/~/extension/~/telephony/sessions",
      ],
      // Alt: SMS + simple call log
      [
        "/restapi/v1.0/account/~/extension/~/message-store/instant?type=SMS",
        "/restapi/v1.0/account/~/extension/~/call-log",
      ],
      // SMS only
      [
        "/restapi/v1.0/account/~/extension/~/message-store/instant?type=SMS",
      ],
      // Message store (broader)
      [
        "/restapi/v1.0/account/~/extension/~/message-store",
      ],
    ];

    let subscription: any = null;
    let usedFilters: string[] = [];
    let lastError = "";

    for (const filters of filterSets) {
      try {
        subscription = await rcApiCall("POST", "/subscription", {
          eventFilters: filters,
          deliveryMode: {
            transportType: "WebHook",
            address: webhookUrl,
          },
          expiresIn: 630720000,
        });
        usedFilters = filters;
        break;
      } catch (err: any) {
        lastError = err.message || String(err);
        continue;
      }
    }

    if (!subscription) {
      return NextResponse.json({
        error: `All filter combinations failed. Last error: ${lastError}`,
        hint: "Check that your RingCentral app has these permissions: ReadMessages, SMS, ReadCallLog, SubscriptionWebhook",
      }, { status: 400 });
    }

    logger.audit("webhook_subscription_created", {
      userId: session.user?.email,
      subscriptionId: subscription.id,
      webhookUrl,
      filters: usedFilters,
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      webhookUrl,
      eventFilters: usedFilters,
      expiresAt: subscription.expirationTime,
    });
  } catch (error: any) {
    logger.error("Webhook subscribe error", { error: error.message });
    return NextResponse.json({ error: error.message || "Failed to create subscription" }, { status: 500 });
  }
}

// DELETE — remove a webhook subscription
export async function DELETE(request: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session } = auth;

  if ((session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { subscriptionId } = await request.json();
    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
    }

    await rcApiCall("DELETE", `/subscription/${subscriptionId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Webhook delete error", { error: error.message });
    return NextResponse.json({ error: error.message || "Failed to delete subscription" }, { status: 500 });
  }
}
