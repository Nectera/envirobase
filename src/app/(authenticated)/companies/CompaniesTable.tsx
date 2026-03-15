"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/LanguageProvider";
import { Search, ChevronRight, Users, TrendingUp } from "lucide-react";

interface Company {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  contacts: any[];
  leads: any[];
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

export default function CompaniesTable({ companies }: { companies: Company[] }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch =
        (company.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (company.city || "").toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === "all" || company.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [companies, search, typeFilter]);

  const types = Array.from(new Set(companies.map((c) => c.type)));

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={t("companies.searchCompanies")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-full text-sm bg-white focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]"
        >
          <option value="all">{t("companies.allTypes")}</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]?.label || type}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile List */}
      <div className="md:hidden space-y-2">
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">{t("companies.noCompanies")}</div>
        ) : (
          filteredCompanies.map((company) => {
            const typeInfo = TYPE_LABELS[company.type] || { label: company.type, color: "bg-gray-100 text-gray-800" };
            return (
              <Link key={company.id} href={`/companies/${company.id}`} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50 transition">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-slate-800 truncate">{company.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${typeInfo.color}`}>{typeInfo.label}</span>
                    {company.city && <span className="text-[11px] text-slate-400">{company.city}, {company.state}</span>}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0 ml-2" />
              </Link>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{t("common.name")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{t("common.type")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{t("companies.location")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Contacts</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Leads</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                  {t("companies.noCompanies")}
                </td>
              </tr>
            ) : (
              filteredCompanies.map((company) => {
                const typeInfo = TYPE_LABELS[company.type] || { label: company.type, color: "bg-gray-100 text-gray-800" };

                return (
                  <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/companies/${company.id}`} className="font-medium text-slate-900 hover:text-[#7BC143]">
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] px-2 py-1 rounded font-semibold ${typeInfo.color}`}>{typeInfo.label}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {company.city}, {company.state}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Users size={16} className="text-slate-400" />
                        {company.contacts.length}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <TrendingUp size={16} className="text-slate-400" />
                        {company.leads.length}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/companies/${company.id}`}
                        className="inline-flex items-center gap-1 text-[#7BC143] hover:text-[#6aad38] font-medium text-sm"
                      >
                        {t("common.view")}
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
