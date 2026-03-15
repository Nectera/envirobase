/**
 * Organizations API — CRUD for multi-tenant organizations.
 *
 * GET  /api/organizations         — List all orgs (super admin only)
 * POST /api/organizations         — Create a new org (admin provisioning)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Only ADMIN users of the root Xtract org can manage organizations
async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  if (user.role !== "ADMIN") return null;
  return user;
}

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true, workers: true, projects: true, leads: true },
      },
    },
  });

  return NextResponse.json(organizations);
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    slug,
    name,
    appName,
    companyName,
    companyShort,
    brandColor,
    accentColor,
    supportEmail,
    companyLocation,
    domain,
    website,
    logoUrl,
    plan = "pro",
    maxUsers = 25,
    maxWorkers = 50,
    features,
  } = body;

  if (!slug || !name) {
    return NextResponse.json(
      { error: "slug and name are required" },
      { status: 400 }
    );
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "slug must be lowercase alphanumeric with hyphens only" },
      { status: 400 }
    );
  }

  // Check uniqueness
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "An organization with this slug already exists" },
      { status: 409 }
    );
  }

  const org = await prisma.organization.create({
    data: {
      slug,
      name,
      appName: appName || name,
      companyName: companyName || name,
      companyShort: companyShort || name,
      brandColor: brandColor || "#7BC143",
      accentColor,
      supportEmail,
      companyLocation,
      domain,
      website,
      logoUrl,
      plan,
      maxUsers,
      maxWorkers,
      features: features || {
        crm: true,
        metrics: true,
        chat: true,
        pipeline: true,
        projects: true,
        scheduling: true,
        timeClock: true,
        compliance: true,
        bonusPool: false,
        contentInventory: true,
        reviewRequests: true,
        knowledgeBase: true,
        aiAssistant: true,
      },
    },
  });

  return NextResponse.json(org, { status: 201 });
}
