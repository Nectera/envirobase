import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const estimate = await prisma.estimate.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: {
        company: true,
        contact: true,
        lead: true,
      },
    });

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    return NextResponse.json(estimate);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    // Verify estimate belongs to org
    const existingEstimate = await prisma.estimate.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingEstimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};

    if (body.companyId !== undefined) data.companyId = body.companyId;
    if (body.leadId !== undefined) data.leadId = body.leadId;
    if (body.contactId !== undefined) data.contactId = body.contactId;
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.status !== undefined) data.status = body.status;
    if (body.validUntil !== undefined) data.validUntil = body.validUntil;
    if (body.lineItems !== undefined) data.lineItems = body.lineItems;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.pandadocDocumentId !== undefined) data.pandadocDocumentId = body.pandadocDocumentId;

    const estimate = await prisma.estimate.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(estimate);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Verify estimate belongs to org
    const existingEstimate = await prisma.estimate.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingEstimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.estimate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
