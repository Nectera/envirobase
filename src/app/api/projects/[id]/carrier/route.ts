import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — get carrier info for a project
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const carriers = await prisma.carrierInfo.findMany({
      where: orgWhere(orgId, { projectId: params.id }),
      include: {
        communications: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(carriers);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create carrier info
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = (session.user as any)?.role;
    if (!["ADMIN", "PROJECT_MANAGER", "SUPERVISOR", "OFFICE"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { carrierName, adjusterName, adjusterEmail, adjusterPhone, claimNumber, policyNumber, dateOfLoss, deductible, notes } = body;

    if (!carrierName) return NextResponse.json({ error: "carrierName required" }, { status: 400 });

    const carrier = await prisma.carrierInfo.create({
      data: orgData(orgId, {
        projectId: params.id,
        carrierName,
        adjusterName: adjusterName || null,
        adjusterEmail: adjusterEmail || null,
        adjusterPhone: adjusterPhone || null,
        claimNumber: claimNumber || null,
        policyNumber: policyNumber || null,
        dateOfLoss: dateOfLoss || null,
        deductible: deductible ? parseFloat(deductible) : null,
        notes: notes || null,
      }),
      include: { communications: true },
    });

    const userName = (session.user as any)?.name || (session.user as any)?.email || "Unknown";
    try {
      await prisma.activity.create({
        data: orgData(orgId, {
          parentType: "project",
          parentId: params.id,
          type: "note",
          content: `Added insurance carrier: ${carrierName}${claimNumber ? ` (Claim #${claimNumber})` : ""}`,
          user: userName,
        }),
      });
    } catch {}

    return NextResponse.json(carrier, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
