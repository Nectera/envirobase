import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { invalidateOrgBrandingCache } from "@/lib/org-branding";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      appName: true, companyName: true, companyShort: true, logoUrl: true,
      brandColor: true, accentColor: true, supportEmail: true,
      companyLocation: true, domain: true, website: true,
    },
  });

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  return NextResponse.json(org);
}

export async function PUT(req: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session, orgId } = auth;

  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const allowedFields = [
    "appName", "companyName", "companyShort", "logoUrl",
    "brandColor", "accentColor", "supportEmail",
    "companyLocation", "domain", "website",
  ];

  const updateData: Record<string, any> = {};
  for (const field of allowedFields) {
    if (field in body) updateData[field] = body[field] || null;
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: updateData,
    select: {
      appName: true, companyName: true, companyShort: true, logoUrl: true,
      brandColor: true, accentColor: true, supportEmail: true,
      companyLocation: true, domain: true, website: true,
    },
  });

  invalidateOrgBrandingCache(orgId);
  return NextResponse.json(updated);
}
