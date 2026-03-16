/**
 * Self-Serve Organization Signup
 *
 * POST /api/organizations/signup
 *
 * Creates a new organization + first admin user in one step.
 * No auth required — this is the public onboarding endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const VALID_PLANS = ["starter", "pro", "enterprise"];

const PLAN_FEATURES: Record<string, Record<string, boolean>> = {
  free: {
    crm: true,
    projects: true,
    scheduling: true,
    timeClock: true,
    compliance: true,
    metrics: false,
    chat: false,
    pipeline: false,
    bonusPool: false,
    contentInventory: false,
    reviewRequests: false,
    knowledgeBase: false,
    aiAssistant: false,
  },
  starter: {
    crm: true,
    projects: true,
    scheduling: true,
    timeClock: true,
    compliance: true,
    metrics: true,
    chat: true,
    pipeline: true,
    bonusPool: false,
    contentInventory: false,
    reviewRequests: false,
    knowledgeBase: false,
    aiAssistant: false,
  },
  pro: {
    crm: true,
    metrics: true,
    chat: true,
    pipeline: true,
    projects: true,
    scheduling: true,
    timeClock: true,
    compliance: true,
    bonusPool: true,
    contentInventory: true,
    reviewRequests: true,
    knowledgeBase: true,
    aiAssistant: true,
  },
  enterprise: {
    crm: true,
    metrics: true,
    chat: true,
    pipeline: true,
    projects: true,
    scheduling: true,
    timeClock: true,
    compliance: true,
    bonusPool: true,
    contentInventory: true,
    reviewRequests: true,
    knowledgeBase: true,
    aiAssistant: true,
  },
};

const PLAN_LIMITS: Record<string, { maxUsers: number; maxWorkers: number }> = {
  free: { maxUsers: 3, maxWorkers: 10 },
  starter: { maxUsers: 10, maxWorkers: 25 },
  pro: { maxUsers: 25, maxWorkers: 50 },
  enterprise: { maxUsers: 100, maxWorkers: 500 },
};

export async function POST(req: NextRequest) {
  // Rate limit by IP
  let clientIp = "unknown";
  try {
    const fwd = req.headers.get("x-forwarded-for");
    const real = req.headers.get("x-real-ip");
    clientIp = (fwd?.split(",")[0] || real) || "unknown";
  } catch { /* ignore */ }

  const rl = checkRateLimit(`signup:${clientIp}`, { maxRequests: 5, windowSeconds: 3600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const {
    companyName,
    slug,
    adminName,
    adminEmail,
    adminPassword,
    plan = "starter",
  } = body;

  // Validate required fields
  if (!companyName || !slug || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json(
      { error: "companyName, slug, adminName, adminEmail, and adminPassword are required" },
      { status: 400 }
    );
  }

  // Validate plan
  const selectedPlan = VALID_PLANS.includes(plan) ? plan : "starter";

  // Validate slug format
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (cleanSlug !== slug || slug.length < 3 || slug.length > 50) {
    return NextResponse.json(
      { error: "slug must be 3-50 characters, lowercase alphanumeric with hyphens" },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(adminEmail)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  // Validate password strength
  if (adminPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Check for existing slug
  const existingOrg = await prisma.organization.findUnique({ where: { slug: cleanSlug } });
  if (existingOrg) {
    return NextResponse.json(
      { error: "This organization URL is already taken" },
      { status: 409 }
    );
  }

  // Check for existing email
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: adminEmail.toLowerCase(), mode: "insensitive" } },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  // Create org + admin user in a transaction
  const result = await prisma.$transaction(async (tx: any) => {
    const limits = PLAN_LIMITS[selectedPlan] || PLAN_LIMITS.starter;
    const features = PLAN_FEATURES[selectedPlan] || PLAN_FEATURES.starter;

    const org = await tx.organization.create({
      data: {
        slug: cleanSlug,
        name: companyName,
        appName: companyName,
        companyName,
        companyShort: companyName,
        status: "active",
        plan: selectedPlan,
        features,
        maxUsers: limits.maxUsers,
        maxWorkers: limits.maxWorkers,
      },
    });

    const passwordHash = await hash(adminPassword, 12);
    const user = await tx.user.create({
      data: {
        email: adminEmail.toLowerCase().trim(),
        passwordHash,
        name: adminName,
        role: "ADMIN",
        organizationId: org.id,
      },
    });

    return { org, user };
  });

  return NextResponse.json(
    {
      message: "Organization created successfully",
      organization: {
        id: result.org.id,
        slug: result.org.slug,
        name: result.org.name,
        plan: result.org.plan,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    },
    { status: 201 }
  );
}
