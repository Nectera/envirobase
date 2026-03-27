"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConsultationActions from "./ConsultationActions";
import { Search, LinkIcon, X } from "lucide-react";

interface LeadOption {
  id: string;
  firstName: string;
  lastName: string;
  status?: string;
}

interface Consultation {
  id: string;
  customerName: string | null;
  address?: string;
  city?: string;
  status: string;
  totalCost?: number | null;
  createdAt: string;
  estimateId?: string | null;
  leadId?: string | null;
  lead?: { id: string; firstName: string; lastName: string } | null;
}

function LeadLinker({
  estimateId,
  currentLead,
  leads,
  onLinked,
}: {
  estimateId: string;
  currentLead: { id: string; firstName: string; lastName: string } | null;
  leads: LeadOption[];
  onLinked: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = leads.filter((l) => {
    const name = `${l.firstName} ${l.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleLink = async (leadId: string | null) => {
    setSaving(true);
    try {
      await fetch(`/api/consultation-estimates/${estimateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      onLinked();
    } catch {
      // silent
    }
    setSaving(false);
    setOpen(false);
    setSearch("");
  };

  if (currentLead) {
    return (
      <div className="flex items-center gap-1">
        <Link
          href={`/leads/${currentLead.id}`}
          className="text-indigo-600 hover:text-indigo-700 text-xs font-medium truncate max-w-[120px]"
          title={`${currentLead.firstName} ${currentLead.lastName}`}
        >
          {currentLead.firstName} {currentLead.lastName}
        </Link>
        <button
          onClick={() => handleLink(null)}
          disabled={saving}
          className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
          title="Unlink lead"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={saving}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition"
      >
        <LinkIcon className="w-3 h-3" />
        <span>Link</span>
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-30 bg-white border border-slate-200 rounded-lg shadow-xl w-64">
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 bg-slate-50 rounded px-2 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="bg-transparent text-xs outline-none w-full text-slate-700 placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-slate-400 px-3 py-2">No leads found</p>
            )}
            {filtered.slice(0, 20).map((l) => (
              <button
                key={l.id}
                onClick={() => handleLink(l.id)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition flex items-center justify-between"
              >
                <span className="text-slate-700 font-medium truncate">
                  {l.firstName} {l.lastName}
                </span>
                {l.status && (
                  <span className="text-[10px] text-slate-400 ml-2 shrink-0">
                    {l.status}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConsultationEstimatesView({
  consultations,
  leads = [],
}: {
  consultations: Consultation[];
  leads?: LeadOption[];
}) {
  const router = useRouter();

  const statusColor: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    costed: "bg-blue-100 text-blue-700",
    converted: "bg-emerald-100 text-emerald-700",
    post_cost: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">
        Consultation Estimates
      </h2>
      <div className="bg-white rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 rounded-t-lg">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Lead
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Address
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Total Cost
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {consultations.map((c: any) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {c.customerName || "—"}
                </td>
                <td className="px-4 py-3">
                  <LeadLinker
                    estimateId={c.id}
                    currentLead={c.lead || null}
                    leads={leads}
                    onLinked={() => router.refresh()}
                  />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {[c.address, c.city].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      statusColor[c.status] || "bg-slate-100"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">
                  {c.totalCost
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(c.totalCost)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {new Date(c.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 items-center justify-end">
                    {c.status === "converted" && c.estimateId && (
                      <Link
                        href={`/invoices/${c.estimateId}`}
                        className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                      >
                        Invoice →
                      </Link>
                    )}
                    <Link
                      href={`/estimates/consultation/${c.id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                    >
                      View →
                    </Link>
                    <ConsultationActions
                      id={c.id}
                      customerName={c.customerName || "Untitled"}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
