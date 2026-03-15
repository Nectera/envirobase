"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { X } from "lucide-react";

type AlertItem = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  date: Date;
};

export default function AlertList({ alerts }: { alerts: AlertItem[] }) {
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  const filters = [
    { key: "all", label: "All" },
    { key: "critical", label: "Critical" },
    { key: "warning", label: "Warning" },
    { key: "info", label: "Info" },
  ];

  async function dismissAlert(id: string) {
    await fetch("/api/alerts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dismissed: true }),
    });
    router.refresh();
  }

  const borderColor = (s: string) =>
    s === "critical" ? "border-l-red-500 bg-red-50/50" : s === "warning" ? "border-l-amber-500 bg-amber-50/50" : "border-l-blue-500 bg-blue-50/50";

  const badgeColor = (s: string) =>
    s === "critical" ? "bg-red-100 text-red-700" : s === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              filter === f.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label} ({f.key === "all" ? alerts.length : alerts.filter((a) => a.severity === f.key).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((a) => (
          <div key={a.id} className={`pl-3 pr-4 py-3 border-l-[3px] rounded-r-md ${borderColor(a.severity)} flex items-start justify-between`}>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                <span className="text-[11px] text-slate-400">{formatDate(a.date)}</span>
              </div>
              <p className="text-xs text-slate-600 mb-2">{a.message}</p>
              <div className="flex gap-2">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badgeColor(a.severity)}`}>{a.severity}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{a.type}</span>
              </div>
            </div>
            <button
              onClick={() => dismissAlert(a.id)}
              className="ml-3 p-1 hover:bg-white rounded transition text-slate-400 hover:text-slate-600"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">No alerts to show</div>
        )}
      </div>
    </div>
  );
}
