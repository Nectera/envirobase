/**
 * Single Organization API
 *
 * GET    /api/organizations/:id  — Get org details
 * PATCH  /api/organizations/:id  — Update org (branding, plan, features, etc.)
 * DELETE /api/organizations/:id  — Soft-delete (set status to 'cancelled')
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateOrgBrandingCache } from "@/lib/org-branding";

export const dynamic = "force-dynamic";

async function requirePlatformAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  if (!user.isPlatformAdmin) return null;
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requirePlatformAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: { users: true, workers: true, projects: true, leads: true },
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(org);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requirePlatformAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Fields that can be updated
  const allowedFields = [
    "name",
    "slug",
    "status",
    "appName",
    "companyName",
    "companyShort",
    "logoUrl",
    "brandColor",
    "accentColor",
    "supportEmail",
    "companyLocation",
    "domain",
    "website",
    "plan",
    "stripeCustomerId",
    "stripeSubscriptionId",
    "trialEndsAt",
    "billingEmail",
    "features",
    "maxUsers",
    "maxWorkers",
  ];

  const data: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const org = await prisma.organization.update({
    where: { id: params.id },
    data,
  });

  // Invalidate branding cache
  invalidateOrgBrandingCache(params.id);

  return NextResponse.json(org);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requirePlatformAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Soft-delete: set status to cancelled rather than removing data
  // (preserves records for the 30-year compliance requirement)
  const org = await prisma.organization.update({
    where: { id: params.id },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ message: "Organization cancelled", org });
}
