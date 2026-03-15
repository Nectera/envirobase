import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { createContactSchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const companyId = req.nextUrl.searchParams.get("companyId") || "";
    const search = req.nextUrl.searchParams.get("search") || "";

    const where: any = { ...orgWhere(orgId) };
    if (companyId) where.companyId = companyId;
    if (search) where.search = search;

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        company: true,
      },
    });

    return NextResponse.json(contacts);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const v = validateBody(createContactSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    const contact = await prisma.contact.create({
      data: orgData(orgId, {
        companyId: body.companyId || null,
        firstName: body.firstName,
        lastName: body.lastName || null,
        name: [body.firstName, body.lastName].filter(Boolean).join(" "),
        title: body.title || "",
        email: body.email || "",
        phone: body.phone || "",
        mobile: body.mobile || "",
        notes: body.notes || "",
        // Address fields
        address: body.address || "",
        city: body.city || "",
        state: body.state || "",
        locationNotes: body.locationNotes || "",
        // Insurance fields
        isInsuranceJob: body.isInsuranceJob || false,
        insuranceCarrier: body.insuranceCarrier || "",
        claimNumber: body.claimNumber || "",
        adjusterName: body.adjusterName || "",
        adjusterContact: body.adjusterContact || "",
        dateOfLoss: body.dateOfLoss || null,
        // Referral & source
        source: body.source || "",
        referralSource: body.referralSource || "",
        referredForTesting: body.referredForTesting || false,
        referredTestingTo: body.referredTestingTo || "",
        // Office
        office: body.office || "",
      }),
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
