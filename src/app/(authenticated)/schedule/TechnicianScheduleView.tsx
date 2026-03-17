"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Clock, Calendar } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

type Entry = {
  id: string;
  workerId: string;
  projectId: string;
  date: string;
  shift: string;
  hours: number;
  notes: string | null;
  project: { id: string; name: string; type: string; address: string; projectNumber?: string } | null;
};

const TYPE_COLORS: Record<string, { bg: string; badge: string; border: string }> = {
  ASBESTOS: { bg: "bg-indigo-50", badge: "bg-indigo-100 text-indigo-700", border: "border-indigo-200" },
  LEAD: { bg: "bg-amber-50", badge: "bg-amber-100 text-amber-700", border: "border-amber-200" },
  METH: { bg: "bg-red-50", badge: "bg-red-100 text-red-700", border: "border-red-200" },
};

const SHIFT_LABELS: Record<string, string> = { full: "Full Day", morning: "Morning", afternoon: "Afternoon" };

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday = 1, so go back to Monday
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildWeekDays(weekStart: Date) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push({
      date: d,
      str: toStr(d),
      dayName: d.toLocaleDateString("en-US", { weekday: "long" }),
      shortDay: d.toLocaleDateString("en-US", { weekday: "short" }),
      monthDay: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }
  return days;
}

export default function TechnicianScheduleView({
  workerName,
  entries,
}: {
  workerName: string;
  entries: Entry[];
}) {
  const { t } = useTranslation();
  // Default to next week
  const now = new Date();
  const nextMonday = getWeekStart(now);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const [weekStart, setWeekStart] = useState(nextMonday);

  const days = buildWeekDays(weekStart);
  const todayStr = toStr(now);

  // Build entry map by date
  const entryMap = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = entryMap.get(e.date) || [];
    list.push(e);
    entryMap.set(e.date, list);
  }

  const weekLabel = `${days[0].monthDay} – ${days[6].monthDay}, ${weekStart.getFullYear()}`;

  // Count total scheduled hours this week
  const weekEntries = days.flatMap((d) => entryMap.get(d.str) || []);
  const totalHours = weekEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const daysScheduled = new Set(weekEntries.map((e) => e.date)).size;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const prev = new Date(weekStart);
              prev.setDate(prev.getDate() - 7);
              setWeekStart(prev);
            }}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            <ChevronLeft size={16} className="text-slate-600" />
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-900">{weekLabel}</div>
          </div>
          <button
            onClick={() => {
              const next = new Date(weekStart);
              next.setDate(next.getDate() + 7);
              setWeekStart(next);
            }}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Week summary */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} />
            <span><strong className="text-slate-700">{daysScheduled}</strong> {t("schedule.daysScheduled")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={13} />
            <span><strong className="text-slate-700">{totalHours}</strong> {t("schedule.hoursScheduled")}</span>
          </div>
        </div>
      </div>

      {/* Day cards */}
      <div className="space-y-2">
        {days.map((day) => {
          const dayEntries = entryMap.get(day.str) || [];
          const isToday = day.str === todayStr;
          const isPast = day.str < todayStr;

          return (
            <div
              key={day.str}
              className={`rounded-lg border ${
                isToday
                  ? "border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200"
                  : day.isWeekend
                  ? "border-slate-100 bg-slate-50/50"
                  : "border-slate-200 bg-white"
              } ${isPast && !isToday ? "opacity-60" : ""}`}
            >
              {/* Day header */}
              <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
                isToday ? "border-indigo-200" : "border-slate-100"
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isToday ? "text-indigo-700" : "text-slate-800"}`}>
                    {day.dayName}
                  </span>
                  <span className={`text-xs ${isToday ? "text-indigo-500" : "text-slate-400"}`}>
                    {day.monthDay}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                      {t("schedule.today")}
                    </span>
                  )}
                </div>
                {dayEntries.length > 0 && (
                  <span className="text-xs text-slate-500">
                    {dayEntries.reduce((s, e) => s + (e.hours || 0), 0)} hrs
                  </span>
                )}
              </div>

              {/* Assignments */}
              <div className="px-4 py-2">
                {dayEntries.length === 0 ? (
                  <div className="text-xs text-slate-400 py-2 italic">
                    {day.isWeekend ? t("schedule.weekend") : t("schedule.noAssignments")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayEntries.map((entry) => {
                      const pType = entry.project?.type?.toUpperCase() || "";
                      const colors = TYPE_COLORS[pType] || { bg: "bg-slate-50", badge: "bg-slate-100 text-slate-700", border: "border-slate-200" };

                      return (
                        <div key={entry.id} className={`flex items-start gap-3 p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900 truncate">
                                {entry.project?.name || "Unknown Project"}
                              </span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors.badge}`}>
                                {pType}
                              </span>
                            </div>
                            {entry.project?.address && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                <MapPin size={10} />
                                {entry.project.address}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {SHIFT_LABELS[entry.shift] || entry.shift} · {entry.hours}h
                              </span>
                              {entry.project?.projectNumber && (
                                <span className="font-mono text-slate-400">{entry.project.projectNumber}</span>
                              )}
                            </div>
                            {entry.notes && (
                              <div className="text-xs text-slate-500 mt-1 italic">{entry.notes}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
