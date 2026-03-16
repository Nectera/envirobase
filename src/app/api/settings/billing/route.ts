/**
 * Billing Settings API
 *
 * GET /api/settings/billing — Get current org billing info
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: {
      plan: true,
      status: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      billingEmail: true,
      maxUsers: true,
      maxWorkers: true,
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json(org);
}
