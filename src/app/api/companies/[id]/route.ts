import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { updateCompanySchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const company = await prisma.company.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: {
        contacts: true,
        leads: {
          include: {
            estimates: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const v = validateBody(updateCompanySchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    const data: any = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type;
    if (body.address !== undefined) data.address = body.address;
    if (body.city !== undefined) data.city = body.city;
    if (body.state !== undefined) data.state = body.state;
    if (body.zip !== undefined) data.zip = body.zip;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.email !== undefined) data.email = body.email;
    if (body.website !== undefined) data.website = body.website;
    if (body.industry !== undefined) data.industry = body.industry;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.referralFeeEnabled !== undefined) data.referralFeeEnabled = body.referralFeeEnabled;
    if (body.referralFeePercent !== undefined) data.referralFeePercent = body.referralFeePercent;

    // Verify company belongs to org
    const existingCompany = await prisma.company.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingCompany) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const company = await prisma.company.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    // Verify company belongs to org
    const existingCompany = await prisma.company.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingCompany) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.company.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
