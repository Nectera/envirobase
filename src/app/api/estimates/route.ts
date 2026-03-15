import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const status = req.nextUrl.searchParams.get("status") || "";
    const companyId = req.nextUrl.searchParams.get("companyId") || "";

    const where: any = { ...orgWhere(orgId) };
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;

    const estimates = await prisma.estimate.findMany({
      where,
      include: {
        company: true,
        lead: true,
        contact: true,
      },
    });

    return NextResponse.json(estimates);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    // Normalize line items: ensure quantity, unitPrice, and total fields are always present
    const rawLineItems = body.lineItems || [];
    const lineItems = rawLineItems.map((item: any, i: number) => {
      const qty = item.quantity ?? item.qty ?? 0;
      const unitPrice = item.unitPrice ?? 0;
      const total = item.total ?? qty * unitPrice;
      return {
        id: item.id || String(i + 1),
        description: item.description || "",
        quantity: qty,
        unit: item.unit || "each",
        unitPrice,
        total,
      };
    });

    const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    const markupPercent = body.markupPercent ?? body.markup ?? 0;
    const markupAmount = subtotal * (markupPercent / 100);
    const total = body.total || subtotal + markupAmount;

    const estimate = await prisma.estimate.create({
      data: orgData(orgId, {
        companyId: body.companyId,
        leadId: body.leadId || null,
        contactId: body.contactId || null,
        title: body.title,
        description: body.description || "",
        scope: body.scope || "",
        amount: body.amount || total,
        status: body.status || "draft",
        validUntil: body.validUntil || null,
        lineItems,
        subtotal,
        markupPercent,
        total,
        notes: body.notes || "",
      }),
    });

    return NextResponse.json(estimate, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
