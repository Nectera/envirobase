"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, MapPin, GripHorizontal, X, Check, Loader2, XCircle } from "lucide-react";

type Worker = { id: string; name: string; role: string; city: string | null; state: string | null; types: string[] };
type Project = { id: string; name: string; type: string; status: string; projectNumber?: string; address: string; startDate: string | null; estEndDate: string | null };
type Entry = {
  id: string;
  workerId: string;
  projectId: string;
  date: string;
  shift: string;
  hours: number;
  notes: string | null;
  worker: Worker | null;
  project: Project | null;
};

const TYPE_LANE: Record<string, { bg: string; border: string; header: string; badge: string; chip: string; selection: string }> = {
  ASBESTOS: { bg: "bg-indigo-50", border: "border-indigo-200", header: "bg-indigo-600", badge: "bg-indigo-100 text-indigo-700", chip: "bg-indigo-100 text-indigo-800 border-indigo-300", selection: "bg-indigo-200/60 border-indigo-400" },
  LEAD: { bg: "bg-amber-50", border: "border-amber-200", header: "bg-amber-500", badge: "bg-amber-100 text-amber-700", chip: "bg-amber-100 text-amber-800 border-amber-300", selection: "bg-amber-200/60 border-amber-400" },
  METH: { bg: "bg-red-50", border: "border-red-200", header: "bg-red-500", badge: "bg-red-100 text-red-700", chip: "bg-red-100 text-red-800 border-red-300", selection: "bg-red-200/60 border-red-400" },
  MOLD: { bg: "bg-teal-50", border: "border-teal-200", header: "bg-teal-600", badge: "bg-teal-100 text-teal-700", chip: "bg-teal-100 text-teal-800 border-teal-300", selection: "bg-teal-200/60 border-teal-400" },
  SELECT_DEMO: { bg: "bg-orange-50", border: "border-orange-200", header: "bg-orange-500", badge: "bg-orange-100 text-orange-700", chip: "bg-orange-100 text-orange-800 border-orange-300", selection: "bg-orange-200/60 border-orange-400" },
  REBUILD: { bg: "bg-violet-50", border: "border-violet-200", header: "bg-violet-500", badge: "bg-violet-100 text-violet-700", chip: "bg-violet-100 text-violet-800 border-violet-300", selection: "bg-violet-200/60 border-violet-400" },
  SELECT_DEMO_REBUILD: { bg: "bg-orange-50", border: "border-orange-200", header: "bg-orange-500", badge: "bg-orange-100 text-orange-700", chip: "bg-orange-100 text-orange-800 border-orange-300", selection: "bg-orange-200/60 border-orange-400" },
};

const SHIFT_LABEL: Record<string, string> = { full: "Full", morning: "AM", afternoon: "PM" };

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDateColumns(start: Date, count: number) {
  const cols = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    cols.push({
      date: d,
      str: toStr(d),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      index: i,
    });
  }
  return cols;
}

// Pending multi-day assignment (after initial drop, before confirm)
type PendingAssignment = {
  workerId: string;
  workerName: string;
  workerTypes: string[];
  projectId: string;
  projectType: string;
  startColIdx: number;
  endColIdx: number;
};

export default function ScheduleTimelineView({
  projects,
  entries,
  onEntryClick,
  onClearDay,
}: {
  projects: Project[];
  entries: Entry[];
  onEntryClick: (entry: Entry) => void;
  onClearDay?: (dateStr: string) => void;
}) {
  const router = useRouter();

  // 28 day window
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 7);
  const dateCols = buildDateColumns(windowStart, 28);
  const todayStr = toStr(now);

  const windowStartStr = dateCols[0].str;
  const windowEndStr = dateCols[dateCols.length - 1].str;

  const timelineProjects = projects
    .filter((p) => p.startDate && p.estEndDate)
    .filter((p) => p.startDate! <= windowEndStr && p.estEndDate! >= windowStartStr)
    .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));

  // Entry map
  const entryMap = new Map<string, Entry[]>();
  const dayEntryCounts = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.projectId}_${e.date}`;
    const list = entryMap.get(key) || [];
    list.push(e);
    entryMap.set(key, list);
    dayEntryCounts.set(e.date, (dayEntryCounts.get(e.date) || 0) + 1);
  }

  // DnD state for worker panel drops
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Multi-day selection state
  const [pending, setPending] = useState<PendingAssignment | null>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Get which column index a date string maps to
  const dateToColIdx = new Map(dateCols.map((c) => [c.str, c.index]));

  // --- DnD handlers (worker panel → timeline) ---
  const handleDragOver = useCallback((e: React.DragEvent, projectId: string, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(`${projectId}_${dateStr}`);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !target.contains(related)) {
      setDragOver(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, projectId: string, dateStr: string, projectType: string) => {
    e.preventDefault();
    setDragOver(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (!data.workerId) return;

      const colIdx = dateToColIdx.get(dateStr);
      if (colIdx === undefined) return;

      // Create a pending multi-day assignment starting at this cell
      setPending({
        workerId: data.workerId,
        workerName: data.workerName,
        workerTypes: data.workerTypes || [],
        projectId,
        projectType,
        startColIdx: colIdx,
        endColIdx: colIdx,
      });
    } catch { /* ignore */ }
  }, [dateToColIdx]);

  // --- Multi-day extend: mouse events on the pending selection ---
  const handleExtendMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!pending) return;
    setIsExtending(true);
  }, [pending]);

  // Track mouse movement over cells during extend
  const handleCellMouseEnter = useCallback((colIdx: number, projectId: string) => {
    if (!isExtending || !pending || pending.projectId !== projectId) return;
    // Only extend right (forward in time), and never before start
    if (colIdx >= pending.startColIdx) {
      setPending((prev) => prev ? { ...prev, endColIdx: colIdx } : null);
    }
  }, [isExtending, pending]);

  // Mouse up anywhere ends the extend
  useEffect(() => {
    if (!isExtending) return;
    const handleUp = () => setIsExtending(false);
    window.addEventListener("mouseup", handleUp);
    return () => window.removeEventListener("mouseup", handleUp);
  }, [isExtending]);

  // --- Confirm or cancel pending ---
  async function confirmPending() {
    if (!pending) return;
    setSaving(true);

    // Collect all dates in the range that are within the project's date range
    const project = projects.find((p) => p.id === pending.projectId);
    const dates: string[] = [];
    for (let i = pending.startColIdx; i <= pending.endColIdx; i++) {
      const col = dateCols[i];
      if (!col) continue;
      // Must be within project date range
      if (project?.startDate && col.str < project.startDate) continue;
      if (project?.estEndDate && col.str > project.estEndDate) continue;
      // Skip if already assigned
      const existing = entryMap.get(`${pending.projectId}_${col.str}`) || [];
      if (existing.some((e) => e.workerId === pending.workerId)) continue;
      dates.push(col.str);
    }

    if (dates.length === 0) {
      setSaving(false);
      setPending(null);
      return;
    }

    // Type mismatch check
    const workerTypes = pending.workerTypes.map((t) => t.toUpperCase());
    const isMismatch = pending.projectType && !workerTypes.includes(pending.projectType.toUpperCase());
    if (isMismatch) {
      if (!confirm(`${pending.workerName} is not ${pending.projectType}-certified. Assign to ${dates.length} day(s) anyway?`)) {
        setSaving(false);
        setPending(null);
        return;
      }
    }

    await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: pending.workerId,
        projectId: pending.projectId,
        dates,
        shift: "full",
        hours: 8,
      }),
    });

    setSaving(false);
    setPending(null);
    router.refresh();
  }

  function cancelPending() {
    setPending(null);
  }

  // Quick remove an entry
  async function handleQuickRemove(e: React.MouseEvent, entryId: string) {
    e.stopPropagation();
    setDeleting(entryId);
    try {
      await fetch(`/api/schedule/${entryId}`, { method: "DELETE" });
      router.refresh();
    } catch { /* ignore */ }
    setDeleting(null);
  }

  // Compute the pending date range for highlighting
  const pendingDates = new Set<string>();
  if (pending) {
    for (let i = pending.startColIdx; i <= pending.endColIdx; i++) {
      if (dateCols[i]) pendingDates.add(`${pending.projectId}_${dateCols[i].str}`);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
      {timelineProjects.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">
          No active projects with start and end dates in this window.
          <br />
          <span className="text-xs">Set start and end dates on projects to see them here.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-max min-w-full text-xs select-none">
            {/* Date header */}
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-3 py-1 text-left w-[200px] min-w-[200px]">
                  <span className="text-xs font-medium text-slate-500">Project</span>
                </th>
                {dateCols.map((col) => {
                  const dayCount = dayEntryCounts.get(col.str) || 0;
                  return (
                    <th
                      key={col.str}
                      className={`border-b border-r border-slate-100 px-0 py-1 text-center min-w-[56px] w-[56px] ${
                        col.str === todayStr ? "bg-indigo-50" : col.isWeekend ? "bg-slate-50" : "bg-white"
                      }`}
                    >
                      <div className={`text-[10px] ${col.str === todayStr ? "text-indigo-600 font-bold" : "text-slate-400"}`}>
                        {col.dayName}
                      </div>
                      <div className={`text-[10px] ${col.str === todayStr ? "text-indigo-700 font-semibold" : "text-slate-500"}`}>
                        {col.label}
                      </div>
                      {onClearDay && dayCount > 0 && (
                        <button
                          onClick={() => onClearDay(col.str)}
                          className="mt-0.5 text-slate-300 hover:text-red-500 transition"
                          title={`Clear all ${dayCount} assignment(s)`}
                        >
                          <XCircle size={10} />
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {timelineProjects.map((project) => {
                const pType = (project.type || "").split(",")[0].trim().toUpperCase();
                const style = TYPE_LANE[pType] || { bg: "bg-slate-50/40", border: "border-slate-200", header: "bg-slate-500", badge: "bg-slate-100 text-slate-700", chip: "bg-slate-100 text-slate-700 border-slate-300", selection: "bg-slate-200/60 border-slate-400" };

                return (
                  <tr key={project.id}>
                    {/* Project header */}
                    <td className={`sticky left-0 z-10 border-b border-r border-slate-200 px-3 py-2 ${style.bg}`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-1 self-stretch rounded-full ${style.header} flex-shrink-0`}></div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate max-w-[160px]" title={project.name}>
                            {project.name}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-[9px] font-semibold px-1 py-0 rounded ${style.badge}`}>
                              {pType}
                            </span>
                            {project.projectNumber && (
                              <span className="text-[9px] text-slate-400 font-mono">{project.projectNumber}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 text-[9px] text-slate-400 mt-0.5 truncate max-w-[160px]" title={project.address}>
                            <MapPin size={8} />
                            {project.address}
                          </div>
                          {project.startDate && project.estEndDate && (
                            <div className="text-[8px] text-slate-400 mt-0.5 font-mono">
                              {new Date(project.startDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {" – "}
                              {new Date(project.estEndDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Day cells */}
                    {dateCols.map((col) => {
                      const inRange = project.startDate! <= col.str && project.estEndDate! >= col.str;
                      const cellKey = `${project.id}_${col.str}`;
                      const cellEntries = entryMap.get(cellKey) || [];
                      const isDragTarget = dragOver === cellKey;
                      const isPendingCell = pendingDates.has(cellKey);

                      // Is this the first cell of the pending selection? Show the extend handle
                      const isPendingStart = pending && pending.projectId === project.id && pending.startColIdx === col.index;
                      const isPendingEnd = pending && pending.projectId === project.id && pending.endColIdx === col.index;

                      if (!inRange) {
                        return (
                          <td key={col.str} className="border-b border-r border-slate-100 min-w-[56px]">
                            <div className="min-h-[36px] bg-repeating-stripe" style={{
                              background: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(148,163,184,0.08) 3px, rgba(148,163,184,0.08) 6px)"
                            }} />
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.str}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOver(cellKey); }}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, project.id, col.str, pType)}
                          onMouseEnter={() => handleCellMouseEnter(col.index, project.id)}
                          className={`border-b border-r border-slate-100 p-0.5 min-w-[56px] transition-colors ${
                            col.str === todayStr ? "bg-indigo-50/50" : col.isWeekend ? `${style.bg} opacity-80` : style.bg
                          } ${isDragTarget ? "!bg-indigo-100 ring-2 ring-inset ring-indigo-400 shadow-inner" : ""}
                          ${isPendingCell ? `!${style.selection} ring-1 ring-inset ring-indigo-400` : ""}
                          ${!isDragTarget && !isPendingCell && cellEntries.length === 0 ? "hover:ring-1 hover:ring-inset hover:ring-slate-300" : ""}`}
                        >
                          <div className="min-h-[36px] space-y-0.5 relative">
                            {/* Existing entries */}
                            {cellEntries.map((entry) => {
                              const workerTypes = entry.worker?.types || [];
                              const wTypes = Array.isArray(workerTypes) ? workerTypes : [];
                              const mismatch = pType && !wTypes.some((t: string) => t.toUpperCase() === pType);
                              const isDeleting = deleting === entry.id;

                              return (
                                <div
                                  key={entry.id}
                                  className={`group text-[9px] leading-tight px-1 py-0.5 rounded border cursor-pointer truncate ${style.chip} ${isDeleting ? "opacity-40" : "hover:opacity-90"}`}
                                  title={`${entry.worker?.name} · ${SHIFT_LABEL[entry.shift] || entry.shift} · ${entry.hours}h`}
                                >
                                  <div className="flex items-center gap-0.5">
                                    {mismatch && <AlertTriangle size={7} className="text-amber-500 flex-shrink-0" />}
                                    <span className="truncate font-medium flex-1" onClick={() => onEntryClick(entry)}>
                                      {entry.worker?.name?.split(" ")[0]}
                                    </span>
                                    <button
                                      onClick={(e) => handleQuickRemove(e, entry.id)}
                                      disabled={isDeleting}
                                      className="hidden group-hover:flex items-center justify-center w-3 h-3 rounded-full bg-red-500 text-white flex-shrink-0 hover:bg-red-600 transition"
                                      title="Remove"
                                    >
                                      {isDeleting ? <Loader2 size={6} className="animate-spin" /> : <X size={6} />}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Pending selection chip */}
                            {isPendingStart && pending && (
                              <div className={`text-[9px] leading-tight px-1 py-0.5 rounded border-2 border-dashed truncate ${style.selection} animate-pulse`}>
                                <div className="flex items-center gap-0.5">
                                  <span className="truncate font-semibold">{pending.workerName.split(" ")[0]}</span>
                                </div>
                              </div>
                            )}

                            {/* Show extend handle on the last cell of pending selection */}
                            {isPendingEnd && pending && !isExtending && (
                              <div
                                onMouseDown={handleExtendMouseDown}
                                className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center hover:bg-indigo-200/50 rounded-r"
                                title="Drag to extend"
                              >
                                <GripHorizontal size={8} className="text-indigo-500" />
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending assignment confirmation bar */}
      {pending && !isExtending && (
        <div className="border-t border-slate-200 px-4 py-2.5 flex items-center justify-between bg-indigo-50">
          <div className="text-xs text-slate-700">
            <span className="font-semibold">{pending.workerName}</span>
            {" → "}
            <span className="font-medium">{projects.find((p) => p.id === pending.projectId)?.name}</span>
            {" · "}
            <span className="text-indigo-600 font-semibold">
              {pending.endColIdx - pending.startColIdx + 1} day{pending.endColIdx !== pending.startColIdx ? "s" : ""}
            </span>
            <span className="text-slate-500 ml-1">
              ({dateCols[pending.startColIdx]?.label} – {dateCols[pending.endColIdx]?.label})
            </span>
            <span className="text-slate-400 ml-2">Drag the handle right to extend</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cancelPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
            >
              <X size={12} /> Cancel
            </button>
            <button
              onClick={confirmPending}
              disabled={saving}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Assign {pending.endColIdx - pending.startColIdx + 1} Day{pending.endColIdx !== pending.startColIdx ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Extending indicator */}
      {isExtending && (
        <div className="border-t border-indigo-300 px-4 py-2 bg-indigo-100 text-xs text-indigo-700 font-medium text-center">
          Drag right to select more days… release to set range
        </div>
      )}
    </div>
  );
}
