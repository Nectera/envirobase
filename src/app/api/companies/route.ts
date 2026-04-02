import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCompanySchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const search = req.nextUrl.searchParams.get("search") || "";
    const type = req.nextUrl.searchParams.get("type") || "";
    const isSubcontractor = req.nextUrl.searchParams.get("isSubcontractor");

    const where: any = orgWhere(orgId);
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (type) where.type = type;
    if (isSubcontractor === "true") where.isSubcontractor = true;

    const companies = await prisma.company.findMany({
      where,
      include: {
        contacts: true,
        leads: true,
      },
    });

    // Add counts for each company
    const withCounts = companies.map((company: any) => ({
      ...company,
      contactsCount: company.contacts?.length || 0,
      leadsCount: company.leads?.length || 0,
    }));

    return NextResponse.json(withCounts);
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
    const v = validateBody(createCompanySchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    const company = await prisma.company.create({
      data: orgData(orgId, {
        name: body.name,
        type: body.type || "client",
        address: body.address || "",
        city: body.city || "",
        state: body.state || "",
        zip: body.zip || "",
        phone: body.phone || "",
        email: body.email || "",
        website: body.website || "",
        notes: body.notes || "",
        referralFeeEnabled: body.referralFeeEnabled || false,
        referralFeePercent: body.referralFeePercent ?? 10,
        isSubcontractor: body.isSubcontractor || false,
      }),
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
