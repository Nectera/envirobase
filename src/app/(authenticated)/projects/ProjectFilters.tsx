"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDate, getTypeBadgeColor, getStatusColor, hasProjectType, getProjectTypes } from "@/lib/utils";
import { TYPE_LABELS } from "@/lib/regulations";
import type { Project, ProjectTask } from "@/types";
import { useTranslation } from "@/components/LanguageProvider";
import { Archive, ChevronDown, ChevronRight, ChevronRight as ChevronRightIcon, Package } from "lucide-react";
import Pagination from "@/components/Pagination";

type ProjectWithTasks = Project & { tasks: ProjectTask[]; contentInventory?: { id: string }[] };

export default function ProjectFilters({ projects }: { projects: ProjectWithTasks[] }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const PROJ_PAGE_SIZE = 25;
  const [projPage, setProjPage] = useState(1);

  // Separate active from archived (completed) projects
  const activeProjects = projects.filter((p) => p.status !== "completed");
  const archivedProjects = projects.filter((p) => p.status === "completed");

  const filtered = filter === "all"
    ? activeProjects
    : activeProjects.filter((p) => hasProjectType(p.type, filter));

  const filteredArchived = filter === "all"
    ? archivedProjects
    : archivedProjects.filter((p) => hasProjectType(p.type, filter));

  const projTotalPages = Math.ceil(filtered.length / PROJ_PAGE_SIZE);
  const paginatedProjects = useMemo(() => {
    const start = (projPage - 1) * PROJ_PAGE_SIZE;
    return filtered.slice(start, start + PROJ_PAGE_SIZE);
  }, [filtered, projPage]);

  // Reset page when filter changes
  useMemo(() => { setProjPage(1); }, [filter]);

  const tabs = [
    { key: "all", label: t("common.all") },
    { key: "ASBESTOS", label: "Asbestos" },
    { key: "LEAD", label: "Lead" },
    { key: "METH", label: "Meth Lab" },
    { key: "MOLD", label: "Mold" },
    { key: "SELECT_DEMO", label: "Select Demo" },
    { key: "REBUILD", label: "Rebuild" },
  ];

  return (
    <div>
      {/* Mobile: Dropdown filter */}
      <div className="md:hidden mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-full bg-white focus:ring-[#7BC143] focus:border-[#7BC143]"
        >
          {tabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.label} ({tab.key === "all" ? activeProjects.length : activeProjects.filter((p) => hasProjectType(p.type, tab.key)).length})
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: Bubble filter buttons */}
      <div className="hidden md:flex gap-2 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition ${
              filter === tab.key
                ? "bg-[#7BC143] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}{" "}
            <span className="opacity-70">
              ({tab.key === "all" ? activeProjects.length : activeProjects.filter((p) => hasProjectType(p.type, tab.key)).length})
            </span>
          </button>
        ))}
      </div>

      {/* Mobile List */}
      <div className="md:hidden space-y-2">
        {paginatedProjects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50 transition">
            <div className="min-w-0">
              <div className="font-medium text-sm text-slate-800 truncate">{p.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                {getProjectTypes(p.type).map((t) => (
                  <span key={t} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getTypeBadgeColor(t)}`}>
                    {TYPE_LABELS[t] || t}
                  </span>
                ))}
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getStatusColor(p.status)}`}>
                  {p.status.replace("_", " ")}
                </span>
                {(p.contentInventory?.length || 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                    <Package size={9} /> {p.contentInventory!.length}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300 flex-shrink-0 ml-2" />
          </Link>
        ))}
        <Pagination currentPage={projPage} totalPages={projTotalPages} totalItems={filtered.length} pageSize={PROJ_PAGE_SIZE} onPageChange={setProjPage} />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{t("common.name")}</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{t("common.type")}</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{t("common.status")}</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Client</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Progress</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Timeline</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Permit</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProjects.map((p) => {
              const done = p.tasks.filter((t) => t.status === "completed").length;
              const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
              const barColors: Record<string, string> = {
                ASBESTOS: "bg-indigo-500", LEAD: "bg-amber-500", METH: "bg-red-500",
                MOLD: "bg-teal-500", SELECT_DEMO: "bg-orange-500", REBUILD: "bg-violet-500",
              };
              const barColor = barColors[getProjectTypes(p.type)[0]] || "bg-slate-500";

              return (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="hover:text-[#7BC143]">
                      <div className="font-medium text-[13px] flex items-center gap-1.5">
                        {p.name}
                        {(p.contentInventory?.length || 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-normal" title={`${p.contentInventory!.length} inventory items`}>
                            <Package size={10} /> {p.contentInventory!.length}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{p.projectNumber} • {p.address}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {getProjectTypes(p.type).map((t) => (
                        <span key={t} className={`text-[11px] font-medium px-2 py-0.5 rounded ${getTypeBadgeColor(t)}`}>
                          {TYPE_LABELS[t] || t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${getStatusColor(p.status)}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{p.client}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {formatDate(p.startDate)} — {formatDate(p.estEndDate)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{p.permitNumber || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination currentPage={projPage} totalPages={projTotalPages} totalItems={filtered.length} pageSize={PROJ_PAGE_SIZE} onPageChange={setProjPage} />
      </div>

      {/* Archived (Completed) Projects */}
      {filteredArchived.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition mb-2"
          >
            {showArchived ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Archive size={14} />
            Archived ({filteredArchived.length})
          </button>

          {showArchived && (
            <div className="bg-slate-50 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto opacity-80">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{t("common.name")}</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{t("common.type")}</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{t("common.status")}</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Client</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Timeline</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Permit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArchived.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-100/50 transition">
                      <td className="px-4 py-3">
                        <Link href={`/projects/${p.id}`} className="hover:text-[#7BC143]">
                          <div className="font-medium text-[13px] text-slate-500">{p.name}</div>
                          <div className="text-[11px] text-slate-400">{p.projectNumber} • {p.address}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {getProjectTypes(p.type).map((t) => (
                            <span key={t} className={`text-[11px] font-medium px-2 py-0.5 rounded ${getTypeBadgeColor(t)}`}>
                              {TYPE_LABELS[t] || t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${getStatusColor(p.status)}`}>
                          completed
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.client}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(p.startDate)} — {formatDate((p as any).endDate || p.estEndDate)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.permitNumber || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
