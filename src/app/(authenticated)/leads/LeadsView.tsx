"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/LanguageProvider";
import { Search, LayoutGrid, List, DollarSign, Calendar, Building2, ChevronRight, GripVertical, CheckSquare, Trash2, XCircle, Edit3, Eye, EyeOff, Archive } from "lucide-react";
import Pagination from "@/components/Pagination";
import CallConfirmModal from "@/components/CallConfirmModal";
import { hasProjectType } from "@/lib/utils";

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  companyId: string;
  contactId: string | null;
  source: string;
  projectType: string;
  status: string;
  estimatedValue: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  office: string | null;
  isInsuranceJob: boolean;
  referredForTesting: boolean;
  isArchived: boolean;
  createdAt: string;
  company: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  estimates: any[];
  project?: { id: string; name: string; status: string } | null;
};

const STAGES = [
  { key: "new", label: "New", color: "bg-slate-100 border-slate-300 text-slate-700" },
  { key: "contacted", label: "Contacted", color: "bg-blue-50 border-blue-300 text-blue-700" },
  { key: "site_visit", label: "Site Visit", color: "bg-amber-50 border-amber-300 text-amber-700" },
  { key: "proposal_sent", label: "Proposal Sent", color: "bg-purple-50 border-purple-300 text-purple-700" },
  { key: "negotiation", label: "Negotiation", color: "bg-indigo-50 border-indigo-300 text-indigo-700" },
  { key: "won", label: "Won", color: "bg-emerald-50 border-emerald-300 text-emerald-700" },
  { key: "lost", label: "Lost", color: "bg-red-50 border-red-300 text-red-700" },
];

const TYPE_BADGE: Record<string, string> = {
  ASBESTOS: "bg-indigo-100 text-indigo-700",
  LEAD: "bg-amber-100 text-amber-700",
  METH: "bg-red-100 text-red-700",
  MOLD: "bg-teal-100 text-teal-700",
  SELECT_DEMO: "bg-orange-100 text-orange-700",
  REBUILD: "bg-violet-100 text-violet-700",
  SELECT_DEMO_REBUILD: "bg-orange-100 text-orange-700",
};

const SOURCE_LABEL: Record<string, string> = {
  referral: "Referral",
  website: "Website",
  cold_call: "Cold Call",
  repeat_client: "Repeat Client",
  other: "Other",
};

function formatCurrency(val: number | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function daysAgo(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

export default function LeadsView({ leads, fieldEstimators = [] }: { leads: Lead[]; fieldEstimators?: { id: string; name: string; position: string | null; office: string | null }[] }) {
  const { t } = useTranslation();
  const [view, setView] = useState<"pipeline" | "table">("pipeline");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [officeFilter, setOfficeFilter] = useState("all");
  const router = useRouter();

  // Site visit scheduling modal state
  const [siteVisitModal, setSiteVisitModal] = useState<{ leadId: string; leadName: string } | null>(null);
  const [siteVisitDate, setSiteVisitDate] = useState("");
  const [siteVisitTime, setSiteVisitTime] = useState("");
  const [siteVisitNotes, setSiteVisitNotes] = useState("");
  const [siteVisitAssignee, setSiteVisitAssignee] = useState("");

  // Active vs Archive tab
  const [tab, setTab] = useState<"active" | "archive">("active");

  // Mobile: hide won/lost by default
  const [showClosed, setShowClosed] = useState(false);

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [bulkEditField, setBulkEditField] = useState<string | null>(null);
  const [bulkEditValue, setBulkEditValue] = useState("");
  const [callConfirm, setCallConfirm] = useState<{ phone: string; name: string } | null>(null);

  // Pagination
  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);

  // Separate active and archived leads first
  const activeLeads = useMemo(() => leads.filter((l) => !l.isArchived), [leads]);
  const archivedLeads = useMemo(() => leads.filter((l) => l.isArchived), [leads]);

  const filtered = useMemo(() => {
    const source = tab === "archive" ? archivedLeads : activeLeads;
    return source.filter((l) => {
      if (typeFilter !== "all" && !hasProjectType(l.projectType, typeFilter)) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (officeFilter !== "all" && l.office !== officeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${l.firstName || ""} ${l.lastName || ""}`.toLowerCase();
        if (
          !fullName.includes(q) &&
          !(l.company?.name || "").toLowerCase().includes(q) &&
          !(l.address || "").toLowerCase().includes(q) &&
          !(l.phone || "").toLowerCase().includes(q) &&
          !(l.notes || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [activeLeads, archivedLeads, tab, search, typeFilter, statusFilter, officeFilter]);

  // Reset page when filters change
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Mobile: filter out lost unless showClosed is on (won is now a visible status)
  const mobileFiltered = useMemo(() => {
    if (showClosed) return filtered;
    return filtered.filter((l) => l.status !== "lost");
  }, [filtered, showClosed]);

  const mobileTotalPages = Math.ceil(mobileFiltered.length / PAGE_SIZE);
  const mobilePaginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return mobileFiltered.slice(start, start + PAGE_SIZE);
  }, [mobileFiltered, currentPage]);

  const closedCount = useMemo(() => {
    return filtered.filter((l) => l.status === "lost").length;
  }, [filtered]);

  // Reset to page 1 when filters change
  useMemo(() => { setCurrentPage(1); }, [search, typeFilter, statusFilter, officeFilter, showClosed, tab]);

  const handleDrop = async (leadId: string, newStatus: string) => {
    if (newStatus === "site_visit") {
      // Check if lead already has a site visit date
      const lead = leads.find((l) => l.id === leadId);
      const leadName = lead ? [lead.firstName, lead.lastName].filter(Boolean).join(" ") : "Lead";
      setSiteVisitModal({ leadId, leadName });
      setSiteVisitDate("");
      setSiteVisitTime("");
      setSiteVisitNotes("");
      setSiteVisitAssignee("");
      return;
    }
    await fetch(`/api/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  };

  const handleSiteVisitConfirm = async () => {
    if (!siteVisitModal || !siteVisitDate) return;
    await fetch(`/api/leads/${siteVisitModal.leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "site_visit",
        siteVisitDate,
        siteVisitTime: siteVisitTime || null,
        siteVisitNotes: siteVisitNotes || null,
        siteVisitAssignee: siteVisitAssignee || null,
      }),
    });
    setSiteVisitModal(null);
    router.refresh();
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await fetch("/api/leads/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateStatus", ids: Array.from(selectedIds), status: newStatus }),
      });
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t("leads.bulkDeleteConfirm"))) return;
    setBulkLoading(true);
    try {
      await fetch("/api/leads/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkMarkLost = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const fields: Record<string, any> = { status: "lost" };
      if (lostReason.trim()) fields.lostReason = lostReason.trim();
      const res = await fetch("/api/leads/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulkUpdate", ids: Array.from(selectedIds), fields }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error || "Failed to update leads"}`);
        return;
      }
      setSelectedIds(new Set());
      setShowLostModal(false);
      setLostReason("");
      router.refresh();
    } catch (err: any) {
      alert(`Error: ${err.message || "Network error"}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkFieldUpdate = async () => {
    if (selectedIds.size === 0 || !bulkEditField || !bulkEditValue) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/leads/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulkUpdate", ids: Array.from(selectedIds), fields: { [bulkEditField]: bulkEditValue } }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error || "Failed to update leads"}`);
        return;
      }
      setSelectedIds(new Set());
      setBulkEditField(null);
      setBulkEditValue("");
      router.refresh();
    } catch (err: any) {
      alert(`Error: ${err.message || "Network error"}`);
    } finally {
      setBulkLoading(false);
    }
  };

  // Pipeline (Kanban) view — Won is now a visible column, only Lost is "closed"
  const activeStages = STAGES.filter((s) => s.key !== "lost");
  const closedStages = STAGES.filter((s) => s.key === "lost");

  return (
    <div>
      {/* Active / Archive Tab Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-sm font-medium rounded-full transition ${
            tab === "active"
              ? "bg-[#7BC143] text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {t("leads.activeLead")}
        </button>
        <button
          onClick={() => setTab("archive")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition ${
            tab === "archive"
              ? "bg-slate-700 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Archive size={14} />
          {t("leads.archive")}
          {archivedLeads.length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              tab === "archive" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {archivedLeads.length}
            </span>
          )}
        </button>
      </div>

      {/* Toolbar */}
      <div className="space-y-3 mb-4">
        {/* Search bar — full width on mobile */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("leads.searchLeads")}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-full focus:ring-[#7BC143] focus:border-[#7BC143]"
          />
        </div>
        {/* Filters row — wraps on mobile */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-full bg-white min-w-0 flex-shrink"
          >
            <option value="all">{t("leads.allTypes")}</option>
            <option value="ASBESTOS">{t("types.asbestos")}</option>
            <option value="LEAD">{t("types.lead")}</option>
            <option value="METH">{t("types.meth")}</option>
            <option value="MOLD">{t("types.mold")}</option>
            <option value="SELECT_DEMO">{t("types.selectDemo")}</option>
            <option value="REBUILD">{t("types.rebuild")}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-full bg-white min-w-0 flex-shrink"
          >
            <option value="all">{t("leads.allStatuses")}</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <select
            value={officeFilter}
            onChange={(e) => setOfficeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-full bg-white min-w-0 flex-shrink"
          >
            <option value="all">{t("leads.allOffices")}</option>
            <option value="greeley">{t("leads.greeley")}</option>
            <option value="grand_junction">{t("leads.grandJunction")}</option>
          </select>
          {/* View toggle — desktop only */}
          <div className="hidden md:flex gap-1 bg-slate-100 rounded-full p-0.5 ml-auto">
            <button
              onClick={() => setView("pipeline")}
              className={`p-1.5 rounded-full transition ${view === "pipeline" ? "bg-white shadow-sm text-slate-800" : "text-slate-400"}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-1.5 rounded-full transition ${view === "table" ? "bg-white shadow-sm text-slate-800" : "text-slate-400"}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile List — always shown on mobile instead of pipeline/table */}
      <div className="md:hidden space-y-2">
        {tab === "archive" ? (
          /* Archive on mobile */
          filtered.length === 0 ? (
            <div className="text-center py-12">
              <Archive size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">{t("leads.noArchivedLeads")}</p>
            </div>
          ) : (
            <>
              {paginatedLeads.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50 transition">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-slate-800 truncate">
                      {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || t("leads.unknown")}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span className="text-[10px] px-1.5 py-0.5 rounded border font-semibold bg-slate-100 border-slate-300 text-slate-600">{t("leads.archived")}</span>
                      {lead.company && <span>{lead.company.name}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0 ml-2" />
                </Link>
              ))}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </>
          )
        ) : (
        /* Active leads on mobile */
      <div className="space-y-2">
        {/* Show/hide closed leads toggle */}
        {closedCount > 0 && (
          <button
            onClick={() => setShowClosed(!showClosed)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-1 py-1 transition"
          >
            {showClosed ? <EyeOff size={13} /> : <Eye size={13} />}
            {showClosed ? t("leads.hideClosed") : t("leads.showClosed")} {closedCount} {closedCount !== 1 ? t("leads.closedLeads") : t("leads.closedLead")}
          </button>
        )}
        {mobileFiltered.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">{t("leads.noLeads")}</div>
        ) : (
          mobilePaginatedLeads.map((lead) => {
            const stageInfo = STAGES.find((s) => s.key === lead.status);
            return (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50 transition">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-slate-800 truncate">
                    {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || t("leads.unknown")}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                    {stageInfo && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${stageInfo.color}`}>{stageInfo.label}</span>
                    )}
                    {lead.company && <span>{lead.company.name}</span>}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0 ml-2" />
              </Link>
            );
          })
        )}
        <Pagination
          currentPage={currentPage}
          totalPages={mobileTotalPages}
          totalItems={mobileFiltered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
        )}
      </div>

      {/* Archive View */}
      {tab === "archive" && (
        <div>
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Archive size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">{t("leads.noArchivedLeads")}</p>
              <p className="text-xs text-slate-400 mt-1">Leads are archived when their linked project is marked as completed.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t("leads.tableHeaderName")}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t("leads.tableHeaderCompany")}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t("common.type")}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t("common.project")}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <Link href={`/leads/${lead.id}`} className="font-medium text-slate-800 hover:text-[#7BC143]">
                          {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || t("leads.unknown")}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{lead.company?.name || "—"}</td>
                      <td className="px-4 py-3">
                        {(lead.projectType || "").split(",").filter(Boolean).map((pt: string) => (
                          <span key={pt} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_BADGE[pt.trim()] || "bg-slate-100"}`}>
                            {pt.trim()}
                          </span>
                        ))}
                      </td>
                      <td className="px-4 py-3">
                        {lead.project ? (
                          <Link href={`/projects/${lead.project.id}`} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                            {lead.project.name}
                            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded border ${
                              lead.project.status === "completed"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                : "bg-slate-50 border-slate-200 text-slate-500"
                            }`}>
                              {lead.project.status}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/leads/${lead.id}`} className="text-[#7BC143] hover:text-[#6aad38] text-xs font-medium">
                          View <ChevronRight size={12} className="inline" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Pipeline View — desktop only */}
      {tab === "active" && view === "pipeline" && (
        <div className="hidden md:block overflow-x-auto">
          <div className="flex gap-3 pb-4 min-w-min">
            {activeStages.map((stage) => {
              const stageLeads = filtered.filter((l) => l.status === stage.key);
              return (
                <div
                  key={stage.key}
                  className="flex-shrink-0 w-[240px]"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-indigo-400"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("ring-2", "ring-indigo-400"); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("ring-2", "ring-indigo-400");
                    const leadId = e.dataTransfer.getData("text/plain");
                    if (leadId) handleDrop(leadId, stage.key);
                  }}
                >
                  <div className={`rounded-t-[20px] px-3 py-2 border-b-2 ${stage.color}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{stage.label}</span>
                      <span className="text-[10px] font-medium bg-white/60 px-1.5 py-0.5 rounded">{stageLeads.length}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-b-[20px] border border-t-0 border-slate-200 min-h-[200px] p-2 space-y-2">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData("text/plain", lead.id); }}
                        className="bg-white rounded-2xl border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:border-[#7BC143] transition shadow-sm"
                      >
                        <Link href={`/leads/${lead.id}`} className="block">
                          <div className="text-sm font-medium text-slate-800 mb-0.5">
                            {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || t("leads.unknown")}
                          </div>
                          {lead.company?.name && (
                            <div className="text-[11px] text-slate-500 mb-1.5">{lead.company.name}</div>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            {(lead.projectType || "").split(",").filter(Boolean).map((pt: string) => (
                              <span key={pt} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${TYPE_BADGE[pt.trim()] || "bg-slate-100 text-slate-600"}`}>
                                {pt.trim()}
                              </span>
                            ))}
                            {lead.isInsuranceJob && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">INS</span>
                            )}
                            <span className="text-[10px] text-slate-400">{SOURCE_LABEL[lead.source] || lead.source}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{daysAgo(lead.createdAt)}</div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Lost summary */}
          {(() => {
            const lostLeads = filtered.filter((l) => l.status === "lost");
            if (lostLeads.length === 0) return null;
            return (
              <div className="mt-4">
                <div className="rounded-2xl border px-4 py-3 bg-red-50 border-red-300 text-red-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Lost</span>
                    <span className="text-sm font-bold">{lostLeads.length} leads</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Table View — desktop only */}
      {tab === "active" && view === "table" && (
        <div className="hidden md:block">
          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="flex mb-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-2.5 items-center gap-3 flex-wrap">
              <CheckSquare size={14} className="text-indigo-600" />
              <span className="text-xs font-medium text-indigo-800">{selectedIds.size} {t("leads.bulkSelected")}</span>
              <div className="flex-1" />

              {/* Mark as Lost — prominent button */}
              <button
                onClick={() => setShowLostModal(true)}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 px-3 py-1.5 rounded-full transition"
              >
                <XCircle size={12} /> {t("leads.markAsLost")}
              </button>

              {/* Bulk Edit dropdown */}
              <select
                onChange={(e) => { if (e.target.value) { setBulkEditField(e.target.value); setBulkEditValue(""); } }}
                disabled={bulkLoading}
                className="text-xs px-2 py-1.5 border border-indigo-200 rounded-full bg-white text-indigo-700"
                value={bulkEditField || ""}
              >
                <option value="" disabled>{t("leads.bulkEdit")}</option>
                <option value="projectType">{t("leads.projectType")}</option>
                <option value="office">{t("leads.office")}</option>
                <option value="source">{t("leads.source")}</option>
                <option value="assignedTo">{t("leads.assignedTo")}</option>
              </select>

              {/* Status change dropdown */}
              <select
                onChange={(e) => { if (e.target.value) handleBulkStatusChange(e.target.value); e.target.value = ""; }}
                disabled={bulkLoading}
                className="text-xs px-2 py-1.5 border border-indigo-200 rounded-full bg-white text-indigo-700"
                defaultValue=""
              >
                <option value="" disabled>{t("leads.bulkChangeStatus")}</option>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>

              <button
                onClick={handleBulkDelete}
                disabled={bulkLoading}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 px-2 py-1.5 rounded-full hover:bg-red-50 transition"
              >
                <Trash2 size={12} /> {t("common.delete")}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5"
              >
                {t("leads.bulkClear")}
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t("common.name")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t("common.client")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t("common.type")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t("common.status")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t("leads.tableHeaderCreated")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.map((lead) => {
                  const stageInfo = STAGES.find((s) => s.key === lead.status);
                  const isChecked = selectedIds.has(lead.id);
                  return (
                    <tr key={lead.id} className={`border-b border-slate-100 transition ${isChecked ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/leads/${lead.id}`} className="font-medium text-slate-800 hover:text-[#7BC143]">
                          {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || t("leads.unknown")}
                        </Link>
                        {lead.phone && <button onClick={(e) => { e.preventDefault(); setCallConfirm({ phone: lead.phone!, name: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown" }); }} className="block text-[11px] text-slate-400 hover:text-blue-600 transition">{lead.phone}</button>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-sm">
                        {lead.company?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_BADGE[lead.projectType] || "bg-slate-100"}`}>
                            {lead.projectType}
                          </span>
                          {lead.isInsuranceJob && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">INS</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${stageInfo?.color || "bg-slate-100"}`}>
                          {stageInfo?.label || lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{daysAgo(lead.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/leads/${lead.id}`} className="text-[#7BC143] hover:text-[#6aad38] text-xs font-medium">
                          View <ChevronRight size={12} className="inline" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
      {/* Mark as Lost Modal */}
      {showLostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{t("leads.markAsLostTitle")}</h3>
            <p className="text-sm text-slate-500 mb-4">
              {t("leads.markAsLostDescription")}
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("leads.lostReason")}</label>
              <textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder={t("leads.lostReasonPlaceholder")}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-[#7BC143] focus:border-[#7BC143]"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setShowLostModal(false); setLostReason(""); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleBulkMarkLost}
                disabled={bulkLoading}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-full font-medium transition"
              >
                {bulkLoading ? t("common.updating") : t("leads.markAsLost")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Field Modal */}
      {bulkEditField && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {t("leads.bulkEditTitle")}: {bulkEditField === "projectType" ? t("leads.projectType") : bulkEditField === "office" ? t("leads.office") : bulkEditField === "source" ? t("leads.source") : t("leads.assignedTo")}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {t("leads.bulkEditDescription")} ({selectedIds.size})
            </p>
            <div>
              {bulkEditField === "projectType" && (
                <select
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-[#7BC143] focus:border-[#7BC143]"
                >
                  <option value="">{t("leads.selectType")}</option>
                  <option value="ASBESTOS">{t("types.asbestos")}</option>
                  <option value="LEAD">{t("types.lead")}</option>
                  <option value="METH">{t("types.meth")}</option>
                  <option value="MOLD">{t("types.mold")}</option>
                  <option value="SELECT_DEMO">{t("types.selectDemo")}</option>
                  <option value="REBUILD">{t("types.rebuild")}</option>
                  <option value="SELECT_DEMO_REBUILD">{t("types.selectDemoRebuild")}</option>
                </select>
              )}
              {bulkEditField === "office" && (
                <select
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-[#7BC143] focus:border-[#7BC143]"
                >
                  <option value="">{t("leads.selectOffice")}</option>
                  <option value="greeley">{t("leads.greeley")}</option>
                  <option value="grand_junction">{t("leads.grandJunction")}</option>
                </select>
              )}
              {bulkEditField === "source" && (
                <select
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-[#7BC143] focus:border-[#7BC143]"
                >
                  <option value="">{t("leads.selectSource")}</option>
                  <option value="referral">{t("leads.referral")}</option>
                  <option value="website">{t("leads.website")}</option>
                  <option value="cold_call">{t("leads.coldCall")}</option>
                  <option value="repeat_client">{t("leads.repeatClient")}</option>
                  <option value="insurance">{t("leads.insurance")}</option>
                  <option value="property_manager">{t("leads.propertyManager")}</option>
                  <option value="realtor">{t("leads.realtor")}</option>
                  <option value="other">{t("leads.other")}</option>
                </select>
              )}
              {bulkEditField === "assignedTo" && (
                <select
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-[#7BC143] focus:border-[#7BC143]"
                >
                  <option value="">{t("leads.selectPerson")}</option>
                  {fieldEstimators.map((w) => (
                    <option key={w.id} value={w.name}>
                      {w.name}{w.position ? ` (${w.position})` : ""}{w.office ? ` — ${w.office}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setBulkEditField(null); setBulkEditValue(""); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleBulkFieldUpdate}
                disabled={bulkLoading || !bulkEditValue}
                className="px-4 py-2 text-sm bg-[#7BC143] hover:bg-[#6aad38] disabled:bg-slate-300 text-white rounded-full font-medium transition"
              >
                {bulkLoading ? t("common.updating") : `${t("leads.updateLeads")} (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Site Visit Scheduling Modal */}
      {siteVisitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{t("leads.scheduleSiteVisit")}</h3>
            <p className="text-sm text-slate-500 mb-4">
              {t("leads.scheduleSiteVisitDescription")} — {siteVisitModal.leadName}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("leads.visitDate")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={siteVisitDate}
                  onChange={(e) => setSiteVisitDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-full focus:ring-[#7BC143] focus:border-[#7BC143]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("leads.visitTime")}</label>
                <input
                  type="time"
                  value={siteVisitTime}
                  onChange={(e) => setSiteVisitTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-full focus:ring-[#7BC143] focus:border-[#7BC143]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("leads.notes")}</label>
                <textarea
                  value={siteVisitNotes}
                  onChange={(e) => setSiteVisitNotes(e.target.value)}
                  placeholder={t("leads.notesPlaceholder")}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-full focus:ring-[#7BC143] focus:border-[#7BC143]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("leads.assignTo")}</label>
                <select
                  value={siteVisitAssignee}
                  onChange={(e) => setSiteVisitAssignee(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-[#7BC143] focus:border-[#7BC143]"
                >
                  <option value="">{t("leads.autoAssign")}</option>
                  {fieldEstimators.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}{w.position ? ` (${w.position})` : ""}{w.office ? ` — ${w.office}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setSiteVisitModal(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSiteVisitConfirm}
                disabled={!siteVisitDate}
                className="px-4 py-2 text-sm bg-[#7BC143] hover:bg-[#6aad38] disabled:bg-slate-300 text-white rounded-full font-medium transition"
              >
{t("leads.scheduleAndMove")}
              </button>
            </div>
          </div>
        </div>
      )}
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
