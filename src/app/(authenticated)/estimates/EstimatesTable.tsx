"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Trash2, CheckSquare } from "lucide-react";

type Estimate = {
  id: string;
  estimateNumber: string;
  companyId: string;
  leadId?: string | null;
  contactId?: string | null;
  status: string;
  total?: number | null;
  data?: any;
  createdAt: string;
  company?: { id: string; name: string } | null;
  lead?: { id: string; projectType?: string } | null;
};

const STATUS_BADGES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

function getEstimateTotal(estimate: Estimate): number | null {
  // Try direct total field first
  if (estimate.total != null && !isNaN(estimate.total)) return estimate.total;
  // Try extracting from JSON data
  if (estimate.data) {
    const d = typeof estimate.data === "string" ? JSON.parse(estimate.data) : estimate.data;
    if (d.total != null && !isNaN(Number(d.total))) return Number(d.total);
    if (d.customerPrice != null && !isNaN(Number(d.customerPrice))) return Number(d.customerPrice);
    if (d.totalCost != null && !isNaN(Number(d.totalCost))) return Number(d.totalCost);
    if (d.amount != null && !isNaN(Number(d.amount))) return Number(d.amount);
  }
  return null;
}

function formatCurrency(val: number | null) {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EstimatesTable({ estimates }: { estimates: Estimate[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    return estimates.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !(e.estimateNumber || "").toLowerCase().includes(q) &&
          !(e.company?.name || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [estimates, search, statusFilter]);

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
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} estimate${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      // Delete one at a time (no batch endpoint)
      await Promise.all(ids.map((id) => fetch(`/api/estimates/${id}`, { method: "DELETE" })));
      setSelectedIds(new Set());
      router.refresh();
    } catch (err: any) {
      alert(`Error: ${err.message || "Failed to delete"}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search estimate number or company..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5 flex items-center gap-3">
          <CheckSquare size={14} className="text-red-600" />
          <span className="text-xs font-medium text-red-800">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 px-3 py-1.5 rounded-full transition"
          >
            <Trash2 size={12} /> {deleting ? "Deleting..." : `Delete ${selectedIds.size}`}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Estimate #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Lead/Project
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((estimate) => {
              const isChecked = selectedIds.has(estimate.id);
              return (
                <tr key={estimate.id} className={`border-b border-slate-100 transition ${isChecked ? "bg-red-50/50" : "hover:bg-slate-50"}`}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(estimate.id)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{estimate.estimateNumber || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800">{estimate.company?.name || "Unknown"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {estimate.lead ? (
                      <div className="text-slate-800">{estimate.lead.projectType || "Project"}</div>
                    ) : (
                      <div className="text-slate-400">—</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        STATUS_BADGES[estimate.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {STATUS_LABELS[estimate.status] || estimate.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {formatCurrency(getEstimateTotal(estimate))}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(estimate.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/estimates/${estimate.id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                    >
                      View <ChevronRight size={12} className="inline" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">
            No estimates found
          </div>
        )}
      </div>
    </div>
  );
}
