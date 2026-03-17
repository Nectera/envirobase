"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/LanguageProvider";
import {
  Search,
  ChevronRight,
  Users,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
} from "lucide-react";

type SortField = "name" | "type" | "location" | "contacts" | "leads";
type SortDir = "asc" | "desc";

interface Company {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  phone?: string;
  email?: string;
  contacts: any[];
  leads: any[];
}

const TYPE_COLORS: Record<string, string> = {
  property_mgmt: "bg-blue-100 text-blue-800",
  school_district: "bg-purple-100 text-purple-800",
  insurance: "bg-teal-100 text-teal-800",
  general_contractor: "bg-orange-100 text-orange-800",
  homeowner: "bg-green-100 text-green-800",
  government: "bg-slate-100 text-slate-800",
  commercial: "bg-indigo-100 text-indigo-800",
  other: "bg-gray-100 text-gray-800",
};

const TYPE_KEYS = ["property_mgmt", "school_district", "insurance", "general_contractor", "homeowner", "government", "commercial", "other"];

export default function CompaniesTable({ companies: initialCompanies }: { companies: Company[] }) {
  const { t } = useTranslation();
  const router = useRouter();

  const getTypeLabel = (type: string) => t(`companies.type.${type}`) !== `companies.type.${type}` ? t(`companies.type.${type}`) : type;
  const getTypeInfo = (type: string) => ({ label: getTypeLabel(type), color: TYPE_COLORS[type] || "bg-gray-100 text-gray-800" });
  const typeOptions = TYPE_KEYS.map((value) => ({ value, label: getTypeLabel(value) }));
  const [companies, setCompanies] = useState(initialCompanies);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    name: string;
    type: string;
    city: string;
    state: string;
    phone: string;
    email: string;
  }>({ name: "", type: "", city: "", state: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "contacts" || field === "leads" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-slate-300 ml-1" />;
    return sortDir === "asc"
      ? <ArrowUp size={14} className="text-[#7BC143] ml-1" />
      : <ArrowDown size={14} className="text-[#7BC143] ml-1" />;
  };

  const filteredCompanies = useMemo(() => {
    const filtered = companies.filter((company) => {
      const matchesSearch =
        (company.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (company.city || "").toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === "all" || company.type === typeFilter;

      return matchesSearch && matchesType;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "");
          break;
        case "type":
          cmp = (a.type || "").localeCompare(b.type || "");
          break;
        case "location":
          cmp = `${a.city || ""} ${a.state || ""}`.localeCompare(`${b.city || ""} ${b.state || ""}`);
          break;
        case "contacts":
          cmp = a.contacts.length - b.contacts.length;
          break;
        case "leads":
          cmp = a.leads.length - b.leads.length;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [companies, search, typeFilter, sortField, sortDir]);

  const types = Array.from(new Set(companies.map((c) => c.type)));

  // Edit handlers
  const startEdit = useCallback((company: Company) => {
    setEditingId(company.id);
    setEditData({
      name: company.name || "",
      type: company.type || "",
      city: company.city || "",
      state: company.state || "",
      phone: company.phone || "",
      email: company.email || "",
    });
    setDeleteConfirmId(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setCompanies((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, ...updated } : c))
      );
      setEditingId(null);
      router.refresh();
    } catch (err) {
      alert(t("companies.failedSave"));
    } finally {
      setSaving(false);
    }
  }, [editingId, editData, router]);

  // Delete handlers
  const confirmDelete = useCallback((id: string) => {
    setDeleteConfirmId(id);
    setEditingId(null);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const executeDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      router.refresh();
    } catch (err) {
      alert(t("companies.failedDelete"));
    } finally {
      setDeletingId(null);
    }
  }, [router]);

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
              {getTypeLabel(type)}
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
            const typeInfo = getTypeInfo(company.type);
            return (
              <div key={company.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                {deleteConfirmId === company.id ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600 font-medium">{t("companies.deleteConfirm")}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => executeDelete(company.id)}
                        disabled={deletingId === company.id}
                        className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        {deletingId === company.id ? <Loader2 size={14} className="animate-spin" /> : t("common.yesDelete")}
                      </button>
                      <button
                        onClick={cancelDelete}
                        className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <Link href={`/companies/${company.id}`} className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-slate-800 truncate">{company.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${typeInfo.color}`}>{typeInfo.label}</span>
                        {company.city && <span className="text-[11px] text-slate-400">{company.city}, {company.state}</span>}
                      </div>
                    </Link>
                    <div className="flex items-center gap-1 ml-2">
                      <Link href={`/companies/${company.id}`}>
                        <button className="p-1.5 text-slate-400 hover:text-[#7BC143] transition">
                          <Pencil size={14} />
                        </button>
                      </Link>
                      <button
                        onClick={() => confirmDelete(company.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none" onClick={() => handleSort("name")}>
                <span className="inline-flex items-center">{t("common.name")}<SortIcon field="name" /></span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none" onClick={() => handleSort("type")}>
                <span className="inline-flex items-center">{t("common.type")}<SortIcon field="type" /></span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none" onClick={() => handleSort("location")}>
                <span className="inline-flex items-center">{t("companies.location")}<SortIcon field="location" /></span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none" onClick={() => handleSort("contacts")}>
                <span className="inline-flex items-center">{t("companies.contacts")}<SortIcon field="contacts" /></span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none" onClick={() => handleSort("leads")}>
                <span className="inline-flex items-center">{t("companies.leads")}<SortIcon field="leads" /></span>
              </th>
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
                const typeInfo = getTypeInfo(company.type);

                return (
                  <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    {editingId === company.id ? (
                      <>
                        <td className="px-6 py-2">
                          <input
                            type="text"
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            placeholder={t("companies.companyName")}
                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-[#7BC143]"
                          />
                        </td>
                        <td className="px-6 py-2">
                          <select
                            value={editData.type}
                            onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-[#7BC143] bg-white"
                          >
                            {typeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-2">
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={editData.city}
                              onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                              placeholder={t("companies.city")}
                              className="w-24 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-[#7BC143]"
                            />
                            <input
                              type="text"
                              value={editData.state}
                              onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                              placeholder={t("companies.state")}
                              className="w-16 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-[#7BC143]"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-2">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Users size={16} className="text-slate-400" />
                            {company.contacts.length}
                          </div>
                        </td>
                        <td className="px-6 py-2">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <TrendingUp size={16} className="text-slate-400" />
                            {company.leads.length}
                          </div>
                        </td>
                        <td className="px-6 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              className="p-1.5 text-[#7BC143] hover:bg-green-50 rounded transition disabled:opacity-50"
                              title={t("common.save")}
                            >
                              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition"
                              title={t("common.cancel")}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : deleteConfirmId === company.id ? (
                      <>
                        <td colSpan={4} className="px-6 py-4">
                          <span className="text-sm text-red-600 font-medium">
                            {t("companies.deleteConfirm")}
                          </span>
                        </td>
                        <td colSpan={2} className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => executeDelete(company.id)}
                              disabled={deletingId === company.id}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition"
                            >
                              {deletingId === company.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                t("common.yesDelete")
                              )}
                            </button>
                            <button
                              onClick={cancelDelete}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                            >
                              {t("common.cancel")}
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
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
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(company)}
                              className="p-1.5 text-slate-400 hover:text-[#7BC143] hover:bg-green-50 rounded transition"
                              title={t("common.edit")}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => confirmDelete(company.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                              title={t("common.delete")}
                            >
                              <Trash2 size={15} />
                            </button>
                            <Link
                              href={`/companies/${company.id}`}
                              className="p-1.5 text-slate-400 hover:text-[#7BC143] hover:bg-green-50 rounded transition"
                              title={t("common.viewDetails")}
                            >
                              <ChevronRight size={15} />
                            </Link>
                          </div>
                        </td>
                      </>
                    )}
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
