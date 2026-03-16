/**
 * Stripe Billing Portal API
 *
 * POST /api/stripe/portal — Create a billing portal session
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBillingPortalSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: user.orgId },
    });

    if (!org?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Please set up billing first." },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") || "https://envirobase.app";

    const portalSession = await createBillingPortalSession({
      customerId: org.stripeCustomerId,
      returnUrl: `${origin}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error("Stripe portal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
