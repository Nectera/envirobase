/**
 * Stripe Checkout API
 *
 * POST /api/stripe/checkout — Create a checkout session for an org
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orgId, plan } = await req.json();

    // Get org details
    const org = await prisma.organization.findUnique({
      where: { id: orgId || user.orgId },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // If org already has a Stripe customer, use billing portal instead
    if (org.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Organization already has an active subscription. Use the billing portal to manage it." },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") || "https://envirobase.app";

    const checkoutSession = await createCheckoutSession({
      orgId: org.id,
      orgName: org.name,
      plan: plan || org.plan,
      email: org.billingEmail || user.email,
      successUrl: `${origin}/dashboard?billing=success`,
      cancelUrl: `${origin}/settings?billing=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
