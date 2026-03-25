"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDate, getTypeBadgeColor, getStatusColor, hasProjectType, getProjectTypes } from "@/lib/utils";
import { TYPE_LABELS } from "@/lib/regulations";
import type { Project, ProjectTask } from "@/types";
import { useTranslation } from "@/components/LanguageProvider";
import { ArrowUp, ArrowDown, ChevronRight, Package } from "lucide-react";
import Pagination from "@/components/Pagination";

type ProjectWithTasks = Project & { tasks: ProjectTask[]; contentInventory?: { id: string }[] };

type SortKey = "name" | "type" | "status" | "client" | "progress" | "startDate" | "permit";
type SortDir = "asc" | "desc";

export default function ProjectFilters({ projects }: { projects: ProjectWithTasks[] }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"active" | "completed" | "archived">("active");
  const [sortKey, setSortKey] = useState<SortKey>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const PROJ_PAGE_SIZE = 25;
  const [projPage, setProjPage] = useState(1);

  // Three-tier project categorization
  const activeProjects = projects.filter((p) => p.status !== "completed" && !(p as any).isArchived);
  const completedProjects = projects.filter((p) => p.status === "completed" && !(p as any).isArchived);
  const archivedProjects = projects.filter((p) => (p as any).isArchived);

  // Pick the right list based on status tab
  const baseList = statusTab === "active" ? activeProjects : statusTab === "completed" ? completedProjects : archivedProjects;

  // Apply type filter
  const filtered = filter === "all" ? baseList : baseList.filter((p) => hasProjectType(p.type, filter));

  // Sorting
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "");
          break;
        case "type":
          cmp = (a.type || "").localeCompare(b.type || "");
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
        case "client":
          cmp = (a.client || "").localeCompare(b.client || "");
          break;
        case "progress": {
          const pctA = a.tasks.length ? a.tasks.filter((t) => t.status === "completed").length / a.tasks.length : 0;
          const pctB = b.tasks.length ? b.tasks.filter((t) => t.status === "completed").length / b.tasks.length : 0;
          cmp = pctA - pctB;
          break;
        }
        case "startDate":
          cmp = (a.startDate || "9999").localeCompare(b.startDate || "9999");
          break;
        case "permit":
          cmp = (a.permitNumber || "").localeCompare(b.permitNumber || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const projTotalPages = Math.ceil(sorted.length / PROJ_PAGE_SIZE);
  const paginatedProjects = useMemo(() => {
    const start = (projPage - 1) * PROJ_PAGE_SIZE;
    return sorted.slice(start, start + PROJ_PAGE_SIZE);
  }, [sorted, projPage]);

  // Reset page when filter or tab changes
  useMemo(() => { setProjPage(1); }, [filter, statusTab]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="ml-1 text-slate-300 group-hover:text-slate-400">↕</span>;
    return sortDir === "asc"
      ? <ArrowUp size={12} className="ml-1 text-[#7BC143]" />
      : <ArrowDown size={12} className="ml-1 text-[#7BC143]" />;
  };

  const typeFilters = [
    { key: "all", label: t("common.all") },
    { key: "ASBESTOS", label: "Asbestos" },
    { key: "LEAD", label: "Lead" },
    { key: "METH", label: "Meth Lab" },
    { key: "MOLD", label: "Mold" },
    { key: "SELECT_DEMO", label: "Select Demo" },
    { key: "REBUILD", label: "Rebuild" },
  ];

  const barColors: Record<string, string> = {
    ASBESTOS: "bg-indigo-500", LEAD: "bg-amber-500", METH: "bg-red-500",
    MOLD: "bg-teal-500", SELECT_DEMO: "bg-orange-500", REBUILD: "bg-violet-500",
  };

  return (
    <div>
      {/* Status Toggle — Active / Completed / Archived */}
      <div className="flex items-center gap-1 mb-4 bg-slate-100 rounded-full p-1 w-fit">
        <button
          onClick={() => setStatusTab("active")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
            statusTab === "active" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Active <span className="text-slate-400 ml-0.5">{activeProjects.length}</span>
        </button>
        <button
          onClick={() => setStatusTab("completed")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
            statusTab === "completed" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Completed <span className="text-slate-400 ml-0.5">{completedProjects.length}</span>
        </button>
        <button
          onClick={() => setStatusTab("archived")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
            statusTab === "archived" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Archived <span className="text-slate-400 ml-0.5">{archivedProjects.length}</span>
        </button>
      </div>

      {/* Mobile: Dropdown type filter */}
      <div className="md:hidden mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-full bg-white focus:ring-[#7BC143] focus:border-[#7BC143]"
        >
          {typeFilters.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.label} ({tab.key === "all" ? baseList.length : baseList.filter((p) => hasProjectType(p.type, tab.key)).length})
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: Bubble type filter buttons */}
      <div className="hidden md:flex gap-2 mb-4 flex-wrap">
        {typeFilters.map((tab) => (
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
              ({tab.key === "all" ? baseList.length : baseList.filter((p) => hasProjectType(p.type, tab.key)).length})
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
        {paginatedProjects.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            No {statusTab} projects{filter !== "all" ? ` of this type` : ""}.
          </div>
        )}
        <Pagination currentPage={projPage} totalPages={projTotalPages} totalItems={sorted.length} pageSize={PROJ_PAGE_SIZE} onPageChange={setProjPage} />
      </div>

      {/* Desktop Table — Sortable */}
      <div className={`hidden md:block rounded-2xl border shadow-sm overflow-x-auto ${
        statusTab === "archived" ? "bg-slate-50 border-slate-100 opacity-80" : statusTab === "completed" ? "bg-emerald-50/30 border-emerald-100" : "bg-white border-slate-100"
      }`}>
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className={`border-b-2 ${statusTab === "completed" ? "border-emerald-200/50" : "border-slate-200"}`}>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold cursor-pointer select-none group" onClick={() => handleSort("name")}>
                <span className="inline-flex items-center">{t("common.name")}<SortIcon col="name" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold cursor-pointer select-none group" onClick={() => handleSort("type")}>
                <span className="inline-flex items-center">{t("common.type")}<SortIcon col="type" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold cursor-pointer select-none group" onClick={() => handleSort("status")}>
                <span className="inline-flex items-center">{t("common.status")}<SortIcon col="status" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold cursor-pointer select-none group" onClick={() => handleSort("client")}>
                <span className="inline-flex items-center">Client<SortIcon col="client" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold cursor-pointer select-none group" onClick={() => handleSort("progress")}>
                <span className="inline-flex items-center">Progress<SortIcon col="progress" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold cursor-pointer select-none group" onClick={() => handleSort("startDate")}>
                <span className="inline-flex items-center">Timeline<SortIcon col="startDate" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold cursor-pointer select-none group" onClick={() => handleSort("permit")}>
                <span className="inline-flex items-center">Permit<SortIcon col="permit" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedProjects.map((p) => {
              const done = p.tasks.filter((t) => t.status === "completed").length;
              const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
              const barColor = barColors[getProjectTypes(p.type)[0]] || "bg-slate-500";

              return (
                <tr key={p.id} className={`border-b hover:bg-slate-50 transition ${
                  statusTab === "completed" ? "border-emerald-100/50" : statusTab === "archived" ? "border-slate-100" : "border-slate-100"
                }`}>
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="hover:text-[#7BC143]">
                      <div className={`font-medium text-[13px] flex items-center gap-1.5 ${statusTab === "archived" ? "text-slate-500" : ""}`}>
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
                  <td className={`px-4 py-3 text-xs ${statusTab === "archived" ? "text-slate-500" : "text-slate-600"}`}>{p.client}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-xs ${statusTab === "archived" ? "text-slate-500" : "text-slate-600"}`}>
                    {formatDate(p.startDate)} — {formatDate(statusTab === "archived" ? ((p as any).endDate || p.estEndDate) : p.estEndDate)}
                  </td>
                  <td className={`px-4 py-3 text-xs ${statusTab === "archived" ? "text-slate-500" : "text-slate-600"}`}>{p.permitNumber || "—"}</td>
                </tr>
              );
            })}
            {paginatedProjects.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                  No {statusTab} projects{filter !== "all" ? ` of this type` : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination currentPage={projPage} totalPages={projTotalPages} totalItems={sorted.length} pageSize={PROJ_PAGE_SIZE} onPageChange={setProjPage} />
      </div>
    </div>
  );
}
