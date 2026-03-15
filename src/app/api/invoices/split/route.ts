import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, depositPercent = 50 } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "invoiceId is required" },
        { status: 400 }
      );
    }

    if (depositPercent < 10 || depositPercent > 90) {
      return NextResponse.json(
        { error: "depositPercent must be between 10 and 90" },
        { status: 400 }
      );
    }

    // Get the original invoice
    const original = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!original) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (original.status === "void" || original.status === "paid") {
      return NextResponse.json(
        { error: `Cannot split a ${original.status} invoice` },
        { status: 400 }
      );
    }

    // Calculate amounts
    const depositAmount = Math.round(original.total * (depositPercent / 100) * 100) / 100;
    const balanceAmount = Math.round((original.total - depositAmount) * 100) / 100;

    // Generate new invoice numbers
    const count = await prisma.invoice.count();
    const year = new Date().getFullYear();
    const depositNumber = `INV-${year}-${String(count + 1).padStart(3, "0")}`;
    const balanceNumber = `INV-${year}-${String(count + 2).padStart(3, "0")}`;

    // Create deposit invoice
    const depositInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: depositNumber,
        consultationEstimateId: original.consultationEstimateId || null,
        projectId: original.projectId || null,
        leadId: original.leadId || null,
        contactId: original.contactId || null,
        companyId: original.companyId || null,
        customerName: original.customerName,
        customerAddress: original.customerAddress,
        customerCity: original.customerCity,
        customerState: original.customerState,
        customerZip: original.customerZip,
        customerEmail: original.customerEmail || "",
        customerPhone: original.customerPhone || "",
        status: "draft",
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: original.dueDate,
        paymentTerms: original.paymentTerms,
        lineItems: [
          {
            id: `dep-${Date.now()}`,
            category: "deposit",
            description: `Deposit (${depositPercent}%) - ${original.invoiceNumber}`,
            quantity: 1,
            unit: "ea",
            unitPrice: depositAmount,
            total: depositAmount,
          },
        ],
        subtotal: depositAmount,
        markupPercent: 0,
        markupAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        total: depositAmount,
        internalCost: Math.round(original.internalCost * (depositPercent / 100) * 100) / 100,
        profitMargin: original.profitMargin || 0,
        scope: original.scope || "",
        notes: `Deposit invoice — ${depositPercent}% of original ${original.invoiceNumber} (${formatCurrency(original.total)})`,
        internalNotes: original.internalNotes || "",
        paymentInstructions: original.paymentInstructions || "",
        createdBy: original.createdBy || null,
        sentDate: null,
        paidDate: null,
        paidAmount: 0,
        splitFromInvoiceId: original.id,
        splitType: "deposit",
      },
    });

    // Create balance invoice
    const balanceInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: balanceNumber,
        consultationEstimateId: original.consultationEstimateId || null,
        projectId: original.projectId || null,
        leadId: original.leadId || null,
        contactId: original.contactId || null,
        companyId: original.companyId || null,
        customerName: original.customerName,
        customerAddress: original.customerAddress,
        customerCity: original.customerCity,
        customerState: original.customerState,
        customerZip: original.customerZip,
        customerEmail: original.customerEmail || "",
        customerPhone: original.customerPhone || "",
        status: "draft",
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: original.dueDate,
        paymentTerms: original.paymentTerms,
        lineItems: [
          {
            id: `bal-${Date.now()}`,
            category: "balance",
            description: `Balance Due (${100 - depositPercent}%) - ${original.invoiceNumber}`,
            quantity: 1,
            unit: "ea",
            unitPrice: balanceAmount,
            total: balanceAmount,
          },
        ],
        subtotal: balanceAmount,
        markupPercent: 0,
        markupAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        total: balanceAmount,
        internalCost: Math.round(original.internalCost * ((100 - depositPercent) / 100) * 100) / 100,
        profitMargin: original.profitMargin || 0,
        scope: original.scope || "",
        notes: `Balance due — ${100 - depositPercent}% of original ${original.invoiceNumber} (${formatCurrency(original.total)})`,
        internalNotes: original.internalNotes || "",
        paymentInstructions: original.paymentInstructions || "",
        createdBy: original.createdBy || null,
        sentDate: null,
        paidDate: null,
        paidAmount: 0,
        splitFromInvoiceId: original.id,
        splitType: "balance",
      },
    });

    // Void the original invoice
    await prisma.invoice.update({
      where: { id: original.id },
      data: {
        status: "void",
        notes: `${original.notes ? original.notes + "\n\n" : ""}Split into deposit ${depositNumber} and balance ${balanceNumber}`,
      },
    });

    return NextResponse.json({
      depositInvoice,
      balanceInvoice,
      originalVoided: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to split invoice" },
      { status: 500 }
    );
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
