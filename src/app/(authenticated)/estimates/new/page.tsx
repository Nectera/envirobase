import { prisma } from "@/lib/prisma";
import NewEstimateForm from "./NewEstimateForm";

export const dynamic = "force-dynamic";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;

  const companies = await prisma.company.findMany({
    include: { contacts: true },
  });

  const leads = await prisma.lead.findMany({
    include: { company: true, contact: true },
  });

  const contacts = await prisma.contact.findMany();

  let preSelectedLead = null;
  if (leadId) {
    preSelectedLead = leads.find((l: any) => l.id === leadId) || null;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">New Estimate</h1>
        <p className="text-sm text-slate-500">Create a new estimate for a lead</p>
      </div>
      <NewEstimateForm
        companies={companies}
        leads={leads}
        contacts={contacts}
        preSelectedLead={preSelectedLead}
      />
    </div>
  );
}
