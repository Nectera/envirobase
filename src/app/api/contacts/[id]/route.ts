import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { updateContactSchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const contact = await prisma.contact.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: {
        company: true,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json(contact);
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
    const v = validateBody(updateContactSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    const data: any = {};

    if (body.companyId !== undefined) data.companyId = body.companyId;
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    // Recompute name when firstName or lastName changes
    if (body.firstName !== undefined || body.lastName !== undefined) {
      const existing = await prisma.contact.findFirst({ where: { id: params.id, organizationId: orgId } });
      const fn = body.firstName !== undefined ? body.firstName : (existing as any)?.firstName || "";
      const ln = body.lastName !== undefined ? body.lastName : (existing as any)?.lastName || null;
      data.name = [fn, ln].filter(Boolean).join(" ");
    }
    if (body.title !== undefined) data.title = body.title;
    if (body.email !== undefined) data.email = body.email;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.mobile !== undefined) data.mobile = body.mobile;
    if (body.notes !== undefined) data.notes = body.notes;
    // Address fields
    if (body.address !== undefined) data.address = body.address;
    if (body.city !== undefined) data.city = body.city;
    if (body.state !== undefined) data.state = body.state;
    if (body.locationNotes !== undefined) data.locationNotes = body.locationNotes;
    // Insurance fields
    if (body.isInsuranceJob !== undefined) data.isInsuranceJob = body.isInsuranceJob;
    if (body.insuranceCarrier !== undefined) data.insuranceCarrier = body.insuranceCarrier;
    if (body.claimNumber !== undefined) data.claimNumber = body.claimNumber;
    if (body.adjusterName !== undefined) data.adjusterName = body.adjusterName;
    if (body.adjusterContact !== undefined) data.adjusterContact = body.adjusterContact;
    if (body.dateOfLoss !== undefined) data.dateOfLoss = body.dateOfLoss;
    // Referral & source
    if (body.source !== undefined) data.source = body.source;
    if (body.referralSource !== undefined) data.referralSource = body.referralSource;
    if (body.referredForTesting !== undefined) data.referredForTesting = body.referredForTesting;
    if (body.referredTestingTo !== undefined) data.referredTestingTo = body.referredTestingTo;
    // Office
    if (body.office !== undefined) data.office = body.office;

    // Verify contact belongs to org
    const existingContact = await prisma.contact.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingContact) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(contact);
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

    // Verify contact belongs to org
    const existingContact = await prisma.contact.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingContact) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.contact.delete({
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
