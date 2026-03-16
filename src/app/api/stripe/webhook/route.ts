/**
 * Stripe Webhook Handler
 *
 * POST /api/stripe/webhook — Handles Stripe events
 *
 * Events handled:
 * - checkout.session.completed: New subscription created
 * - customer.subscription.updated: Plan change, renewal, etc.
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.payment_failed: Payment failed
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = "nodejs";

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("No request body");

  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const result = await reader.read();
    if (result.value) chunks.push(result.value);
    done = result.done;
  }

  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify webhook signature if secret is configured
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // In development without webhook secret, parse directly
      event = JSON.parse(rawBody.toString()) as Stripe.Event;
      console.warn("⚠️ Stripe webhook signature not verified (STRIPE_WEBHOOK_SECRET not set)");
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        const plan = session.metadata?.plan;

        if (orgId && session.subscription && session.customer) {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              status: "active",
              plan: plan || undefined,
              billingEmail: session.customer_email || undefined,
            },
          });
          console.log(`✅ Org ${orgId} subscribed to ${plan} plan`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;

        if (orgId) {
          const status = subscription.status === "active" ? "active" :
                         subscription.status === "trialing" ? "trialing" :
                         subscription.status === "past_due" ? "active" : // Keep active but flag
                         "suspended";

          // Get plan from price metadata
          const priceId = subscription.items.data[0]?.price?.id;
          let plan: string | undefined;
          if (priceId) {
            try {
              const price = await stripe.prices.retrieve(priceId);
              plan = (price.metadata?.plan as string) || undefined;
            } catch { /* ignore */ }
          }

          const updateData: Record<string, any> = { status };
          if (plan) updateData.plan = plan;

          // Update limits based on plan
          if (plan === "starter") {
            updateData.maxUsers = 10;
            updateData.maxWorkers = 25;
          } else if (plan === "pro") {
            updateData.maxUsers = 25;
            updateData.maxWorkers = 50;
          } else if (plan === "enterprise") {
            updateData.maxUsers = 100;
            updateData.maxWorkers = 500;
          }

          await prisma.organization.update({
            where: { id: orgId },
            data: updateData,
          });
          console.log(`✅ Org ${orgId} subscription updated — status: ${status}, plan: ${plan || "unchanged"}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;

        if (orgId) {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              status: "cancelled",
              stripeSubscriptionId: null,
            },
          });
          console.log(`⚠️ Org ${orgId} subscription cancelled`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Find org by subscription ID
          const org = await prisma.organization.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
          });

          if (org) {
            console.warn(`⚠️ Payment failed for org ${org.id} (${org.name})`);
            // Could send an email notification here
          }
        }
        break;
      }

      default:
        // Unhandled event type — just log it
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
