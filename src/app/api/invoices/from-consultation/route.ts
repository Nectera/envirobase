import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LABOR_RATES } from "@/lib/materials";

export const dynamic = "force-dynamic";

/**
 * Convert a consultation estimate to an invoice.
 * The consultation estimate contains internal costs (labor, COGS, materials).
 * The customer-facing invoice shows a single service line item with the total price.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { consultationEstimateId, markupPercent, scope, notes, paymentTerms, serviceDescription } = body;

  if (!consultationEstimateId) {
    return NextResponse.json({ error: "consultationEstimateId is required" }, { status: 400 });
  }

  const ce = await prisma.consultationEstimate.findUnique({
    where: { id: consultationEstimateId },
  });

  if (!ce) {
    return NextResponse.json({ error: "Consultation estimate not found" }, { status: 404 });
  }

  // Calculate internal cost totals
  const supRate = LABOR_RATES.supervisor.hourly + LABOR_RATES.supervisor.taxBurden;
  const techRate = LABOR_RATES.technician.hourly + LABOR_RATES.technician.taxBurden;
  const laborCost = (ce.supervisorHours || 0) * supRate + (ce.supervisorOtHours || 0) * supRate * 1.5
    + (ce.technicianHours || 0) * techRate + (ce.technicianOtHours || 0) * techRate * 1.5;
  const cogsCost = (ce.cogs || []).reduce((s: number, c: any) => s + (c.cost || 0), 0);
  const materialCost = (ce.materials || []).reduce((s: number, m: any) => {
    const cost = m.cost ?? (m.qty * (m.unitPrice || 0));
    return s + cost;
  }, 0);
  const internalCost = laborCost + cogsCost + materialCost;

  // Apply markup
  const markup = markupPercent ?? 40;
  const total = internalCost * (1 + markup / 100);
  const markupAmount = total - internalCost;
  const profitMargin = total > 0 ? ((total - internalCost) / total) * 100 : 0;

  // Single customer-facing line item
  const lineItems = [
    {
      id: "1",
      category: "service",
      description: serviceDescription || "Abatement Services",
      quantity: 1,
      unit: "project",
      unitPrice: total,
      total: total,
    },
  ];

  // Due date based on payment terms
  const issueDate = new Date().toISOString().split("T")[0];
  const terms = paymentTerms || "net_30";
  const daysMap: Record<string, number> = { net_30: 30, net_15: 15, due_on_receipt: 0 };
  const dueDays = daysMap[terms] ?? 30;
  const due = new Date();
  due.setDate(due.getDate() + dueDays);
  const dueDate = due.toISOString().split("T")[0];

  // Generate invoice number
  const count = await prisma.invoice.count();
  const year = new Date().getFullYear();
  const invoiceNumber = `INV-${year}-${String(count + 1).padStart(3, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      consultationEstimateId: ce.id,
      projectId: null,
      leadId: ce.leadId || null,
      contactId: null,
      companyId: null,
      customerName: ce.customerName,
      customerAddress: ce.address,
      customerCity: ce.city,
      customerState: ce.state,
      customerZip: ce.zip,
      customerEmail: "",
      customerPhone: "",
      status: "draft",
      issueDate,
      dueDate,
      paymentTerms: terms,
      lineItems,
      subtotal: total,
      markupPercent: markup,
      markupAmount,
      taxPercent: 0,
      taxAmount: 0,
      total,
      internalCost,
      profitMargin,
      scope: scope || ce.scopeOfWork || "",
      notes: notes || "",
      internalNotes: "",
      paymentInstructions: "Please make checks payable to Xtract Environmental Services.\n903 5th St, Greeley, CO 80631",
      createdBy: null,
      sentDate: null,
      paidDate: null,
      paidAmount: 0,
    },
  });

  // Mark consultation estimate as converted
  await prisma.consultationEstimate.update({
    where: { id: ce.id },
    data: { status: "converted", estimateId: invoice.id },
  });

  return NextResponse.json(invoice, { status: 201 });
}
