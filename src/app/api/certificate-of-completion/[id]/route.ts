import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const item = await prisma.certificateOfCompletion.findUnique({
      where: orgWhere(orgId, { id: params.id }),
      include: { project: true },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const item = await prisma.certificateOfCompletion.update({
      where: orgWhere(orgId, { id: params.id }),
      data: {
        workSiteAddress: body.workSiteAddress,
        policyNumber: body.policyNumber,
        claimNumber: body.claimNumber,
        purchaseOrderNumber: body.purchaseOrderNumber,
        jobNumber: body.jobNumber,
        demobilizationDate: body.demobilizationDate,
        propertyOwnerName: body.propertyOwnerName,
        propertyOwnerSignDate: body.propertyOwnerSignDate,
        companyRepName: body.companyRepName,
        companyRepSignDate: body.companyRepSignDate,
        status: body.status,
      },
    });
    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await prisma.certificateOfCompletion.delete({ where: orgWhere(orgId, { id: params.id }) });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
