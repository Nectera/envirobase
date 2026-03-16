/**
 * One-time script to create Stripe products and prices.
 * Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/setup-stripe.ts
 *
 * Or simpler: npx tsx scripts/setup-stripe.ts
 *
 * After running, copy the price IDs into your .env and Vercel env vars.
 */

import Stripe from "stripe";
// @ts-ignore
import * as dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const PLANS = [
  { id: "starter", name: "EnviroBase Starter", price: 59900, description: "For growing operations — up to 10 users, 25 workers" },
  { id: "pro", name: "EnviroBase Pro", price: 79900, description: "Full platform for established companies — up to 25 users, 50 workers" },
];

async function main() {
  console.log("Creating Stripe products and prices...\n");

  for (const plan of PLANS) {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { plan: plan.id },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { plan: plan.id },
    });

    console.log(`${plan.name}:`);
    console.log(`  Product ID: ${product.id}`);
    console.log(`  Price ID:   ${price.id}`);
    console.log();
  }

  console.log("Add these to your .env:\n");
  console.log("# Copy the price IDs from above:");
  console.log('STRIPE_PRICE_STARTER="price_xxx"');
  console.log('STRIPE_PRICE_PRO="price_xxx"');
}

main().catch(console.error);
