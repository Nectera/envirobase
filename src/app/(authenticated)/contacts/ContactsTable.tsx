"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/LanguageProvider";
import {
  Search,
  ChevronRight,
  Mail,
  Phone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
} from "lucide-react";
import CallConfirmModal from "@/components/CallConfirmModal";

interface Company {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName?: string | null;
  name?: string;
  title: string;
  email?: string;
  phone?: string;
  primary: boolean;
  company: Company | null;
}

type SortField = "name" | "company" | "title" | "email" | "phone";
type SortDir = "asc" | "desc";

export default function ContactsTable({ contacts: initialContacts }: { contacts: Contact[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    phone: string;
  }>({ firstName: "", lastName: "", title: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  // Call confirm state
  const [callConfirm, setCallConfirm] = useState<{ phone: string; name: string } | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-slate-300 ml-1" />;
    return sortDir === "asc"
      ? <ArrowUp size={14} className="text-[#7BC143] ml-1" />
      : <ArrowDown size={14} className="text-[#7BC143] ml-1" />;
  };

  // Unique companies for filter dropdown
  const companies = useMemo(() => {
    const companyMap = new Map<string, string>();
    contacts.forEach((c) => {
      if (c.company) companyMap.set(c.company.id, c.company.name);
    });
    return Array.from(companyMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const filtered = contacts.filter((contact) => {
      const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
      const q = search.toLowerCase();
      const matchesSearch =
        fullName.toLowerCase().includes(q) ||
        (contact.company?.name || "").toLowerCase().includes(q) ||
        (contact.title || "").toLowerCase().includes(q) ||
        (contact.email || "").toLowerCase().includes(q) ||
        (contact.phone || "").toLowerCase().includes(q);

      const matchesCompany =
        companyFilter === "all" ||
        (companyFilter === "none" ? !contact.company : contact.company?.id === companyFilter);

      return matchesSearch && matchesCompany;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": {
          const aName = [a.firstName, a.lastName].filter(Boolean).join(" ");
          const bName = [b.firstName, b.lastName].filter(Boolean).join(" ");
          cmp = aName.localeCompare(bName);
          break;
        }
        case "company":
          cmp = (a.company?.name || "").localeCompare(b.company?.name || "");
          break;
        case "title":
          cmp = (a.title || "").localeCompare(b.title || "");
          break;
        case "email":
          cmp = (a.email || "").localeCompare(b.email || "");
          break;
        case "phone":
          cmp = (a.phone || "").localeCompare(b.phone || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [contacts, search, companyFilter, sortField, sortDir]);

  // Edit handlers
  const startEdit = useCallback((contact: Contact) => {
    setEditingId(contact.id);
    setEditData({
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
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
      const res = await fetch(`/api/contacts/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setContacts((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, ...updated } : c))
      );
      setEditingId(null);
      router.refresh();
    } catch (err) {
      alert(t("contacts.failedSave"));
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
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      router.refresh();
    } catch (err) {
      alert(t("contacts.failedDelete"));
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
            placeholder={t("contacts.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]"
          />
        </div>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-full text-sm bg-white focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]"
        >
          <option value="all">{t("contacts.allCompanies")}</option>
          <option value="none">{t("contacts.noCompany")}</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile List */}
      <div className="md:hidden space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">{t("contacts.noContacts")}</div>
        ) : (
          filteredContacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
              {deleteConfirmId === contact.id ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-600 font-medium">{t("contacts.deleteConfirm")}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => executeDelete(contact.id)}
                      disabled={deletingId === contact.id}
                      className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      {deletingId === contact.id ? <Loader2 size={14} className="animate-spin" /> : t("contacts.yesDelete")}
                    </button>
                    <button
                      onClick={cancelDelete}
                      className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <Link href={`/contacts/${contact.id}`} className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-slate-800 truncate">
                      {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      {contact.company && <span>{contact.company.name}</span>}
                      {contact.title && <span>{contact.company ? "·" : ""} {contact.title}</span>}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 ml-2">
                    <Link href={`/contacts/${contact.id}`}>
                      <button className="p-1.5 text-slate-400 hover:text-[#7BC143] transition">
                        <Pencil size={14} />
                      </button>
                    </Link>
                    <button
                      onClick={() => confirmDelete(contact.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th
                className="px-4 py-2.5 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort("name")}
              >
                <span className="inline-flex items-center">{t("common.name")}<SortIcon field="name" /></span>
              </th>
              <th
                className="px-4 py-2.5 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort("title")}
              >
                <span className="inline-flex items-center">{t("contacts.title")}<SortIcon field="title" /></span>
              </th>
              <th
                className="px-4 py-2.5 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort("company")}
              >
                <span className="inline-flex items-center">{t("contacts.company")}<SortIcon field="company" /></span>
              </th>
              <th
                className="px-4 py-2.5 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort("email")}
              >
                <span className="inline-flex items-center">{t("common.email")}<SortIcon field="email" /></span>
              </th>
              <th
                className="px-4 py-2.5 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort("phone")}
              >
                <span className="inline-flex items-center">{t("common.phone")}<SortIcon field="phone" /></span>
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  {t("contacts.noContacts")}
                </td>
              </tr>
            ) : (
              filteredContacts.map((contact) => (
                <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  {editingId === contact.id ? (
                    <>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={editData.firstName}
                            onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                            placeholder="First"
                            className="w-20 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-[#7BC143]"
                          />
                          <input
                            type="text"
                            value={editData.lastName}
                            onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                            placeholder="Last"
                            className="w-20 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-[#7BC143]"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editData.title}
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                          placeholder="Title"
                          className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-[#7BC143]"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {contact.company ? (
                          <Link href={`/companies/${contact.company.id}`} className="text-[#7BC143] hover:text-[#6aad38] font-medium">
                            {contact.company.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="email"
                          value={editData.email}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          placeholder="Email"
                          className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-[#7BC143]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="tel"
                          value={editData.phone}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          placeholder="Phone"
                          className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-[#7BC143]"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="p-1.5 text-[#7BC143] hover:bg-green-50 rounded transition disabled:opacity-50"
                            title="Save"
                          >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : deleteConfirmId === contact.id ? (
                    <>
                      <td colSpan={4} className="px-4 py-3">
                        <span className="text-sm text-red-600 font-medium">
                          Delete &quot;{[contact.firstName, contact.lastName].filter(Boolean).join(" ")}&quot;?
                        </span>
                      </td>
                      <td colSpan={2} className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => executeDelete(contact.id)}
                            disabled={deletingId === contact.id}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition"
                          >
                            {deletingId === contact.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              t("contacts.yesDelete")
                            )}
                          </button>
                          <button
                            onClick={cancelDelete}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <Link href={`/contacts/${contact.id}`} className="font-medium text-[#7BC143] hover:text-[#6aad38] text-sm">
                          {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{contact.title}</td>
                      <td className="px-4 py-3 text-sm">
                        {contact.company ? (
                          <Link href={`/companies/${contact.company.id}`} className="text-[#7BC143] hover:text-[#6aad38] font-medium">
                            {contact.company.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {contact.email ? (
                          <div className="flex items-center gap-1">
                            <Mail size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {contact.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone size={13} className="text-slate-400 shrink-0" />
                            <button onClick={() => setCallConfirm({ phone: contact.phone!, name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unknown" })} className="hover:text-blue-600 transition">{contact.phone}</button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(contact)}
                            className="p-1.5 text-slate-400 hover:text-[#7BC143] hover:bg-green-50 rounded transition"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => confirmDelete(contact.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {callConfirm && (
        <CallConfirmModal
          phoneNumber={callConfirm.phone}
          contactName={callConfirm.name}
          onConfirm={() => { const phone = callConfirm.phone; setCallConfirm(null); window.location.href = `tel:${phone}`; }}
          onCancel={() => setCallConfirm(null)}
        />
      )}
    </div>
  );
}
