/**
 * Stripe Setup API — creates products and prices in Stripe
 *
 * POST /api/stripe/setup — One-time setup (super admin only)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setupStripeProducts } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await setupStripeProducts();
    return NextResponse.json({
      message: "Stripe products and prices created. Add these price IDs to your env vars.",
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
