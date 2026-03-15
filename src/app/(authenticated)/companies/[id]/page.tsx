import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Building2, MapPin, Phone, Mail } from "lucide-react";
import CompanyDetail from "./CompanyDetail";

export const dynamic = "force-dynamic";

interface CompanyPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: true,
      leads: {
        include: {
          estimates: true,
        },
      },
    },
  });

  if (!company) {
    notFound();
  }

  const rawActivities = await prisma.activity.findMany({
    where: { parentType: "company", parentId: id },
    take: 20,
  });
  const activities = rawActivities.map((a: any) => ({ ...a, description: a.content || a.description || "" }));

  // Fetch linked activities from contacts and leads
  const contactIds = (company.contacts || []).map((c: any) => c.id);
  const leadIds = (company.leads || []).map((l: any) => l.id);
  const linkedIds = [...contactIds, ...leadIds];
  let linkedActivities: any[] = [];
  if (linkedIds.length > 0) {
    const allLinked = await prisma.activity.findMany({
      where: {
        parentId: { in: linkedIds },
      },
      take: 30,
    });
    // Tag each with source info
    linkedActivities = allLinked.map((a: any) => {
      const contact = (company.contacts || []).find((c: any) => c.id === a.parentId);
      const lead = (company.leads || []).find((l: any) => l.id === a.parentId);
      return {
        ...a,
        description: a.content || a.description || "",
        _linkedFrom: contact ? contact.name : lead ? lead.title || "Lead" : "Linked",
      };
    });
  }

  const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    property_mgmt: { label: "Property Mgmt", color: "bg-blue-100 text-blue-800" },
    school_district: { label: "School District", color: "bg-purple-100 text-purple-800" },
    insurance: { label: "Insurance", color: "bg-teal-100 text-teal-800" },
    general_contractor: { label: "General Contractor", color: "bg-orange-100 text-orange-800" },
    homeowner: { label: "Homeowner", color: "bg-green-100 text-green-800" },
    government: { label: "Government", color: "bg-slate-100 text-slate-800" },
    commercial: { label: "Commercial", color: "bg-indigo-100 text-indigo-800" },
    other: { label: "Other", color: "bg-gray-100 text-gray-800" },
  };

  const typeInfo = TYPE_LABELS[company.type] || { label: company.type, color: "bg-gray-100 text-gray-800" };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${typeInfo.color}`}>{typeInfo.label}</span>
        </div>
        <div className="flex gap-4 text-slate-600 text-sm">
          <div className="flex items-center gap-1">
            <MapPin size={16} />
            {company.city}, {company.state}
          </div>
          {company.phone && (
            <div className="flex items-center gap-1">
              <Phone size={16} />
              {company.phone}
            </div>
          )}
          {company.email && (
            <div className="flex items-center gap-1">
              <Mail size={16} />
              {company.email}
            </div>
          )}
          {(company as any).referralFeeEnabled && (
            <div className="flex items-center gap-1">
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-800">
                Referral Fee: {(company as any).referralFeePercent ?? 10}%
              </span>
            </div>
          )}
        </div>
      </div>

      <CompanyDetail company={company} activities={activities} linkedActivities={linkedActivities} />
    </div>
  );
}
