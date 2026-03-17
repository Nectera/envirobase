"use client";

import { useState } from "react";
import { Search, MapPin, AlertTriangle, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

type Cert = { id: string; name: string; expires: string | null; status: string };
type Worker = {
  id: string;
  name: string;
  role: string;
  city: string | null;
  state: string | null;
  types: string[];
  certifications?: Cert[];
};

const TYPE_BADGE: Record<string, string> = {
  ASBESTOS: "bg-indigo-100 text-indigo-700",
  LEAD: "bg-amber-100 text-amber-700",
  METH: "bg-red-100 text-red-700",
  MOLD: "bg-teal-100 text-teal-700",
  SELECT_DEMO: "bg-orange-100 text-orange-700",
  REBUILD: "bg-violet-100 text-violet-700",
  SELECT_DEMO_REBUILD: "bg-orange-100 text-orange-700",
};

function certStatus(expires: string | null): "active" | "expiring" | "expired" {
  if (!expires) return "active";
  const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "active";
}

export default function WorkerPanel({
  workers,
  collapsed,
  onToggle,
}: {
  workers: Worker[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const filtered = workers.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      w.role.toLowerCase().includes(q) ||
      w.types.some((t) => t.toLowerCase().includes(q)) ||
      (w.city && w.city.toLowerCase().includes(q))
    );
  });

  if (collapsed) {
    return (
      <div className="w-10 flex-shrink-0 bg-white border border-slate-200 rounded-lg flex flex-col items-center py-3">
        <button onClick={onToggle} className="text-slate-400 hover:text-indigo-600 mb-3" title={t("schedule.expand")}>
          <ChevronRight size={16} />
        </button>
        {workers.slice(0, 8).map((w) => (
          <div
            key={w.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "copy";
              e.dataTransfer.setData("application/json", JSON.stringify({
                workerId: w.id,
                workerName: w.name,
                workerTypes: w.types,
              }));
            }}
            className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 mb-1 cursor-grab active:cursor-grabbing hover:bg-indigo-100"
            title={w.name}
          >
            {w.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-[240px] flex-shrink-0 bg-white border border-slate-200 rounded-lg flex flex-col max-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-700">{t("schedule.workers")}</h3>
        <button onClick={onToggle} className="text-slate-400 hover:text-indigo-600" title={t("schedule.collapse")}>
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("schedule.searchNameType")}
            className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Worker Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.map((worker) => {
          const types = Array.isArray(worker.types) ? worker.types : [];
          const certs = worker.certifications || [];
          const activeCerts = certs.filter((c) => certStatus(c.expires) === "active").length;
          const expiringCerts = certs.filter((c) => certStatus(c.expires) === "expiring").length;
          const expiredCerts = certs.filter((c) => certStatus(c.expires) === "expired").length;

          return (
            <div
              key={worker.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData("application/json", JSON.stringify({
                  workerId: worker.id,
                  workerName: worker.name,
                  workerTypes: types,
                }));
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:bg-indigo-50/30 transition select-none"
            >
              {/* Name + Role */}
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="text-xs font-semibold text-slate-800 leading-tight">{worker.name}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{worker.role}</div>
                </div>
              </div>

              {/* Location */}
              {(worker.city || worker.state) && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1.5">
                  <MapPin size={9} />
                  {[worker.city, worker.state].filter(Boolean).join(", ")}
                </div>
              )}

              {/* Type Badges */}
              <div className="flex flex-wrap gap-1 mb-1.5">
                {types.map((t) => (
                  <span key={t} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${TYPE_BADGE[t.toUpperCase()] || "bg-slate-100 text-slate-600"}`}>
                    {t}
                  </span>
                ))}
              </div>

              {/* Cert Summary */}
              {certs.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Shield size={9} className="text-slate-400" />
                  {activeCerts > 0 && (
                    <span className="text-emerald-600">{activeCerts} {t("schedule.active")}</span>
                  )}
                  {expiringCerts > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-600">
                      <AlertTriangle size={8} /> {expiringCerts} {t("schedule.expiring")}
                    </span>
                  )}
                  {expiredCerts > 0 && (
                    <span className="flex items-center gap-0.5 text-red-600">
                      <AlertTriangle size={8} /> {expiredCerts} {t("schedule.expired")}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-4 text-xs text-slate-400">{t("common.noMatches")}</div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-slate-100 text-[10px] text-slate-400 text-center">
        {t("schedule.dragWorkerTimeline")}
      </div>
    </div>
  );
}
