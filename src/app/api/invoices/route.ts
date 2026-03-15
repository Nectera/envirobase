import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { createInvoiceSchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const status = req.nextUrl.searchParams.get("status") || "";
    const projectId = req.nextUrl.searchParams.get("projectId") || "";

    const where: any = { ...orgWhere(orgId) };
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const items = await prisma.invoice.findMany({
      where,
      include: { company: true, contact: true, lead: true },
    });
    return NextResponse.json(items);
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
    const v = validateBody(createInvoiceSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    // Generate invoice number
    const count = await prisma.invoice.count();
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(3, "0")}`;

    const item = await prisma.invoice.create({
      data: orgData(orgId, {
        invoiceNumber,
        consultationEstimateId: body.consultationEstimateId || null,
        projectId: body.projectId || null,
        leadId: body.leadId || null,
        contactId: body.contactId || null,
        companyId: body.companyId || null,
        customerName: body.customerName || "",
        customerAddress: body.customerAddress || "",
        customerCity: body.customerCity || "",
        customerState: body.customerState || "",
        customerZip: body.customerZip || "",
        customerEmail: body.customerEmail || "",
        customerPhone: body.customerPhone || "",
        status: body.status || "draft",
        issueDate: body.issueDate || new Date().toISOString().split("T")[0],
        dueDate: body.dueDate || "",
        paymentTerms: body.paymentTerms || "net_30",
        lineItems: body.lineItems || [],
        subtotal: body.subtotal || 0,
        markupPercent: body.markupPercent ?? 0,
        markupAmount: body.markupAmount || 0,
        taxPercent: body.taxPercent ?? 0,
        taxAmount: body.taxAmount || 0,
        total: body.total || 0,
        internalCost: body.internalCost || 0,
        profitMargin: body.profitMargin || 0,
        scope: body.scope || "",
        notes: body.notes || "",
        internalNotes: body.internalNotes || "",
        paymentInstructions: body.paymentInstructions || "",
        createdBy: body.createdBy || null,
        sentDate: null,
        paidDate: null,
        paidAmount: 0,
      }),
    });

    // If created from a consultation estimate, mark it as converted
    if (body.consultationEstimateId) {
      await prisma.consultationEstimate.update({
        where: { id: body.consultationEstimateId },
        data: { status: "converted", estimateId: item.id },
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
