import { prisma } from "@/lib/prisma";
import PipelineView from "./PipelineView";

export default async function PipelinePage() {
  // Fetch won leads with relations
  const leads = await prisma.lead.findMany({
    where: { status: "won" },
    include: { company: true, contact: true },
  });

  // Fetch all consultation estimates and invoices for stage derivation
  const consultationEstimates = await prisma.consultationEstimate.findMany();
  const invoices = await prisma.invoice.findMany();

  // Build opportunity objects
  const opportunities = (leads as any[]).map((lead: any) => {
    const estimate = (consultationEstimates as any[]).find(
      (e: any) => e.leadId === lead.id
    ) || null;

    // Find all non-void invoices for this lead
    const leadInvoices = (invoices as any[]).filter(
      (i: any) =>
        i.status !== "void" &&
        (i.leadId === lead.id ||
          (lead.projectId && i.projectId === lead.projectId))
    );

    // The "final" invoice is the balance invoice (from a split) or a non-split invoice
    // Deposit invoices (splitType === "deposit") don't drive pipeline stage
    const finalInvoice = leadInvoices.find(
      (i: any) => i.splitType !== "deposit"
    ) || null;

    // Any invoice (including deposits) for value/display purposes
    const invoice = finalInvoice || leadInvoices[0] || null;

    // Derive stage — respect manual override from drag-and-drop
    let stage: string;
    if (lead.pipelineStage) {
      stage = lead.pipelineStage;
    } else if (finalInvoice && finalInvoice.status === "paid") {
      stage = "paid";
    } else if (finalInvoice && (finalInvoice.status === "sent" || finalInvoice.status === "overdue")) {
      stage = "invoiced";
    } else if (
      estimate &&
      (estimate.status === "converted" || estimate.status === "approved" || estimate.status === "accepted" || (invoice && invoice.status === "draft"))
    ) {
      stage = "scheduled";
    } else {
      stage = "estimating";
    }

    let value = 0;
    if (invoice) {
      value = invoice.total || 0;
    } else if (estimate) {
      value = (estimate as any).customerPrice || (estimate as any).totalCost || 0;
    } else {
      value = lead.estimatedValue || 0;
    }

    let profitMargin: number | null = null;
    if (invoice && invoice.internalCost && invoice.total) {
      profitMargin = (invoice.total - invoice.internalCost) / invoice.total;
    }

    return {
      id: lead.id,
      leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown",
      companyName: lead.company?.name || "",
      contactName: lead.contact ? [(lead.contact as any).firstName, (lead.contact as any).lastName].filter(Boolean).join(" ") : "",
      address: [lead.address, lead.city, lead.state].filter(Boolean).join(", "),
      projectType: lead.projectType || "ASBESTOS",
      stage,
      value,
      profitMargin,
      isInsuranceJob: lead.isInsuranceJob || false,
      wonDate: lead.wonDate || lead.updatedAt,
      invoiceDate: invoice?.issueDate || null,
      paidDate: invoice?.paidDate || null,
      leadId: lead.id,
      projectId: lead.projectId || null,
      estimateId: estimate?.id || null,
      invoiceId: invoice?.id || null,
      invoiceNumber: invoice?.invoiceNumber || null,
      invoiceStatus: invoice?.status || null,
      estimateStatus: estimate?.status || null,
      leadStatus: lead.status || null,
      createdAt: lead.createdAt,
    };
  });

  return (
    <div>
      <PipelineView opportunities={opportunities} />
    </div>
  );
}
