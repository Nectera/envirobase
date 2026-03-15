import { prisma } from "@/lib/prisma";
import CRMDashboardClient from "./CRMDashboardClient";

export const dynamic = "force-dynamic";

export default async function CRMDashboard() {
  // Fetch all required data
  const leads = await prisma.lead.findMany({
    include: { company: true, contact: true, estimates: true },
    orderBy: { createdAt: "desc" },
  });

  const estimates = await prisma.estimate.findMany({
    include: { company: true, lead: true },
  });

  const invoices = await prisma.invoice.findMany({});

  // Fetch consultation estimates for opportunity pipeline stage derivation
  const consultationEstimates = await prisma.consultationEstimate.findMany();

  // Serialize for client component (strip non-serializable fields)
  const serializedLeads = leads.map((l: any) => ({
    id: l.id,
    firstName: l.firstName ?? null,
    lastName: l.lastName ?? null,
    status: l.status,
    estimatedValue: l.estimatedValue ?? null,
    createdAt: l.createdAt,
    projectType: l.projectType,
    address: l.address ?? null,
    wonDate: l.wonDate ?? null,
    pipelineStage: l.pipelineStage ?? null,
    projectId: l.projectId ?? null,
    updatedAt: l.updatedAt ?? l.createdAt,
    lostDate: l.lostDate ?? null,
    company: l.company ? { name: l.company.name } : null,
    contact: l.contact ? { name: [(l.contact as any).firstName, (l.contact as any).lastName].filter(Boolean).join(" ") || l.contact.name } : null,
  }));

  const serializedEstimates = estimates.map((e: any) => ({
    id: e.id,
    estimateNumber: e.estimateNumber || e.id,
    status: e.status,
    total: e.total || 0,
    createdAt: e.createdAt,
    acceptedDate: e.acceptedDate ?? null,
    company: e.company ? { name: e.company.name } : null,
  }));

  const serializedInvoices = invoices.map((inv: any) => ({
    id: inv.id,
    status: inv.status,
    issueDate: inv.issueDate ?? null,
    sentDate: inv.sentDate ?? null,
    paidDate: inv.paidDate ?? null,
    createdAt: inv.createdAt,
    total: inv.total ?? 0,
    leadId: inv.leadId ?? null,
    projectId: inv.projectId ?? null,
    splitType: inv.splitType ?? null,
    internalCost: inv.internalCost ?? null,
  }));

  const serializedConsultationEstimates = (consultationEstimates as any[]).map((ce: any) => ({
    id: ce.id,
    leadId: ce.leadId ?? null,
    status: ce.status,
    customerPrice: ce.customerPrice ?? 0,
    totalCost: ce.totalCost ?? 0,
    customerName: ce.customerName ?? null,
    address: ce.address ?? null,
    city: ce.city ?? null,
    createdAt: ce.createdAt,
  }));

  // Pass server timestamp so client renders consistently
  const now = new Date();
  const serverNow = {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
  };

  return (
    <CRMDashboardClient
      leads={serializedLeads}
      estimates={serializedEstimates}
      invoices={serializedInvoices}
      consultationEstimates={serializedConsultationEstimates}
      serverNow={serverNow}
    />
  );
}
