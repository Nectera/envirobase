import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

// Plan price IDs — populated by the setup script or manually in Stripe dashboard
// These are stored as env vars so they can differ between test/live mode
export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
};

export const PLAN_DETAILS: Record<string, { name: string; price: number; interval: "month" }> = {
  starter: { name: "EnviroBase Starter", price: 59900, interval: "month" },
  pro: { name: "EnviroBase Pro", price: 79900, interval: "month" },
};

/**
 * Create Stripe products and prices for each plan.
 * Run once to set up, then store the price IDs in env vars.
 */
export async function setupStripeProducts() {
  const results: Record<string, { productId: string; priceId: string }> = {};

  for (const [planId, details] of Object.entries(PLAN_DETAILS)) {
    // Create product
    const product = await stripe.products.create({
      name: details.name,
      metadata: { plan: planId },
    });

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: details.price,
      currency: "usd",
      recurring: { interval: details.interval },
      metadata: { plan: planId },
    });

    results[planId] = { productId: product.id, priceId: price.id };
  }

  return results;
}

/**
 * Create a Stripe Checkout session for a new subscription.
 */
export async function createCheckoutSession({
  orgId,
  orgName,
  plan,
  email,
  successUrl,
  cancelUrl,
}: {
  orgId: string;
  orgName: string;
  plan: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for plan: ${plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      orgId,
      plan,
    },
    subscription_data: {
      metadata: {
        orgId,
        plan,
      },
    },
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create a Stripe billing portal session for managing subscriptions.
 */
export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Get subscription details for a Stripe customer.
 */
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel a subscription (at period end).
 */
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
