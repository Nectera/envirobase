"use client";

import { AlertTriangle, XCircle } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_BG: Record<string, string> = {
  ASBESTOS: "bg-indigo-50 border-indigo-200 text-indigo-700",
  LEAD: "bg-amber-50 border-amber-200 text-amber-700",
  METH: "bg-red-50 border-red-200 text-red-700",
  MOLD: "bg-teal-50 border-teal-200 text-teal-700",
  SELECT_DEMO: "bg-orange-50 border-orange-200 text-orange-700",
  REBUILD: "bg-violet-50 border-violet-200 text-violet-700",
  SELECT_DEMO_REBUILD: "bg-orange-50 border-orange-200 text-orange-700",
};

const SHIFT_LABEL: Record<string, string> = {
  full: "Full Day",
  morning: "AM",
  afternoon: "PM",
};

type Worker = { id: string; name: string; role: string; city: string | null; state: string | null; types: string[]; [key: string]: any };
type Entry = {
  id: string;
  workerId: string;
  projectId: string;
  date: string;
  shift: string;
  hours: number;
  notes: string | null;
  worker: Worker | null;
  project: { id: string; name: string; type: string; status: string; [key: string]: any } | null;
};

export default function CalendarWeekView({
  date,
  entries,
  workers,
  onDayClick,
  onEntryClick,
  onClearDay,
}: {
  date: Date;
  entries: Entry[];
  workers: Worker[];
  onDayClick: (dateStr: string) => void;
  onEntryClick: (entry: any) => void;
  onClearDay?: (dateStr: string) => void;
}) {
  const { t } = useTranslation();
  // Calculate week range (Mon-Sun)
  const weekStart = new Date(date);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const weekDates: { date: Date; dateStr: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekDates.push({
      date: d,
      dateStr: toStr(d),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Group entries by worker+date
  const entryMap = new Map<string, Entry[]>();
  const dayEntryCounts = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.workerId}_${e.date}`;
    const list = entryMap.get(key) || [];
    list.push(e);
    entryMap.set(key, list);
    dayEntryCounts.set(e.date, (dayEntryCounts.get(e.date) || 0) + 1);
  }

  // Only show workers who have assignments this week, plus all workers
  const workerIds = new Set(entries.map((e) => e.workerId));
  const activeWorkers = workers.filter((w) => workerIds.has(w.id));
  const inactiveWorkers = workers.filter((w) => !workerIds.has(w.id));
  const sortedWorkers = [...activeWorkers, ...inactiveWorkers];

  function workerMatchesProject(worker: Worker, projectType: string): boolean {
    const wTypes = Array.isArray(worker.types) ? worker.types : [];
    return wTypes.some((t: string) => t.toUpperCase() === projectType.toUpperCase());
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 sticky left-0 bg-slate-50 z-10 w-[160px] min-w-[160px]">
              {t("schedule.worker")}
            </th>
            {weekDates.map((d, i) => {
              const dayCount = dayEntryCounts.get(d.dateStr) || 0;
              return (
                <th
                  key={i}
                  className={`px-2 py-2 text-center text-xs font-medium min-w-[120px] ${
                    d.dateStr === todayStr ? "text-indigo-600 bg-indigo-50/50" : "text-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{DAY_NAMES[i]}</span>
                    {onClearDay && dayCount > 0 && (
                      <button
                        onClick={() => onClearDay(d.dateStr)}
                        className="text-slate-300 hover:text-red-500 transition"
                        title={`Clear all ${dayCount} assignment(s)`}
                      >
                        <XCircle size={12} />
                      </button>
                    )}
                  </div>
                  <div className={`text-[10px] ${d.dateStr === todayStr ? "font-bold" : "font-normal"}`}>{d.label}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedWorkers.map((worker) => (
            <tr key={worker.id} className="hover:bg-slate-50/50">
              <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-slate-100">
                <div className="text-xs font-medium text-slate-700">{worker.name}</div>
                <div className="text-[10px] text-slate-400 capitalize">{worker.role}</div>
              </td>
              {weekDates.map((d, i) => {
                const cellEntries = entryMap.get(`${worker.id}_${d.dateStr}`) || [];
                return (
                  <td
                    key={i}
                    onClick={() => onDayClick(d.dateStr)}
                    className={`px-1 py-1 cursor-pointer transition hover:bg-slate-100 ${
                      d.dateStr === todayStr ? "bg-indigo-50/30" : ""
                    }`}
                  >
                    {cellEntries.map((entry) => {
                      const pType = entry.project?.type?.toUpperCase() || "";
                      const mismatch = pType && !workerMatchesProject(worker, pType);
                      return (
                        <div
                          key={entry.id}
                          onClick={(e) => { e.stopPropagation(); onEntryClick(entry); }}
                          className={`text-[10px] leading-tight px-1.5 py-1 rounded border mb-0.5 cursor-pointer hover:opacity-80 ${
                            TYPE_BG[pType] || "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          <div className="font-medium truncate flex items-center gap-0.5">
                            {mismatch && <AlertTriangle size={9} className="text-amber-500 flex-shrink-0" />}
                            {entry.project?.name?.substring(0, 14)}
                          </div>
                          <div className="text-[9px] opacity-70">
                            {SHIFT_LABEL[entry.shift] || entry.shift} · {entry.hours}h
                          </div>
                        </div>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
          {sortedWorkers.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center py-8 text-sm text-slate-400">
                {t("schedule.noWorkersYet")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
