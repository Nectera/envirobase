import { NextResponse, NextRequest } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    // Fetch all consultation estimates, invoices, and relevant leads
    const consultationEstimates = await prisma.consultationEstimate.findMany({
      where: orgWhere(orgId),
      include: { lead: { include: { company: true, contact: true } } },
    });
    const invoices = await prisma.invoice.findMany({
      where: orgWhere(orgId),
    });

    // Fetch all won leads with relations (for Scheduled/Invoiced/Paid stages)
    const wonLeads = await prisma.lead.findMany({
      where: { ...orgWhere(orgId), status: "won" },
      include: { company: true, contact: true },
    });

    const opportunities: any[] = [];
    const processedLeadIds = new Set<string>();

    // --- ESTIMATING COLUMN: leads with open estimates (draft/sent) ---
    const openEstimates = (consultationEstimates as any[]).filter(
      (e: any) => e.status === "draft" || e.status === "sent"
    );

    for (const estimate of openEstimates) {
      const lead = estimate.lead;
      if (!lead) continue;

      processedLeadIds.add(lead.id);

      const value = (estimate as any).customerPrice || (estimate as any).totalCost || lead.estimatedValue || 0;

      opportunities.push({
        id: lead.id,
        leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown",
        companyName: lead.company?.name || "",
        contactName: lead.contact ? [(lead.contact as any).firstName, (lead.contact as any).lastName].filter(Boolean).join(" ") : "",
        address: [lead.address, lead.city, lead.state].filter(Boolean).join(", "),
        projectType: lead.projectType || "ASBESTOS",
        stage: "estimating",
        value,
        profitMargin: null,
        isInsuranceJob: lead.isInsuranceJob || false,
        leadStatus: lead.status,
        wonDate: lead.wonDate || lead.updatedAt,
        invoiceDate: null,
        paidDate: null,
        leadId: lead.id,
        projectId: lead.projectId || null,
        estimateId: estimate.id,
        invoiceId: null,
        invoiceNumber: null,
        invoiceStatus: null,
        estimateStatus: estimate.status,
        createdAt: lead.createdAt,
      });
    }

    // --- SCHEDULED / INVOICED / PAID: won leads that have progressed past estimating ---
    for (const lead of wonLeads as any[]) {
      // Skip won leads that are already in the estimating column (open estimate)
      if (processedLeadIds.has(lead.id)) continue;

      const estimate = (consultationEstimates as any[]).find(
        (e: any) => e.leadId === lead.id
      ) || null;

      const leadInvoices = (invoices as any[]).filter(
        (i: any) =>
          i.status !== "void" &&
          (i.leadId === lead.id ||
            (lead.projectId && i.projectId === lead.projectId))
      );

      const finalInvoice = leadInvoices.find(
        (i: any) => i.splitType !== "deposit"
      ) || null;

      const invoice = finalInvoice || leadInvoices[0] || null;

      // Derive pipeline stage — respect manual override from drag-and-drop
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
        // Won lead without an open estimate and no further progress — put in scheduled as default
        stage = "scheduled";
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

      opportunities.push({
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
        leadStatus: lead.status,
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
        createdAt: lead.createdAt,
      });
    }

    return NextResponse.json(opportunities);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
