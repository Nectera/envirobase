import { prisma } from "@/lib/prisma";
import NewLeadForm from "./NewLeadForm";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const companies = await prisma.company.findMany({
    include: { contacts: true },
  });

  const contacts = await prisma.contact.findMany();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">New Lead</h1>
        <p className="text-sm text-slate-500">Create a new lead for your pipeline</p>
      </div>
      <NewLeadForm companies={companies} contacts={contacts} />
    </div>
  );
}
