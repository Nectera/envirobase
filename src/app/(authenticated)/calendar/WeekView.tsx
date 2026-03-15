"use client";

import { useMemo } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import { Users } from "lucide-react";

const PROJECT_COLORS: Record<string, string> = {
  ASBESTOS: "bg-indigo-100 text-indigo-700 border-indigo-200",
  LEAD: "bg-amber-100 text-amber-700 border-amber-200",
  METH: "bg-red-100 text-red-700 border-red-200",
  MOLD: "bg-teal-100 text-teal-700 border-teal-200",
  SELECT_DEMO: "bg-orange-100 text-orange-700 border-orange-200",
  REBUILD: "bg-violet-100 text-violet-700 border-violet-200",
};

const TIMEOFF_COLORS: Record<string, string> = {
  vacation: "bg-blue-100 text-blue-700",
  sick: "bg-rose-100 text-rose-700",
  personal: "bg-purple-100 text-purple-700",
  jury_duty: "bg-yellow-100 text-yellow-700",
  bereavement: "bg-slate-200 text-slate-600",
  unpaid: "bg-gray-100 text-gray-600",
};

interface ScheduledProject {
  project: any;
  workers: any[];
  entries: any[];
}

interface WeekViewProps {
  currentDate: Date;
  getEntriesForDay: (dateStr: string) => { scheduledProjects: ScheduledProject[]; timeOffs: any[]; events: any[] };
  onDayClick: (dateStr: string) => void;
}

export default function WeekView({ currentDate, getEntriesForDay, onDayClick }: WeekViewProps) {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];

  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - dayOfWeek);

    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const cursor = new Date(start);
      cursor.setDate(start.getDate() + i);
      days.push(cursor.toISOString().split("T")[0]);
    }
    return days;
  }, [currentDate]);

  return (
    <div className="grid grid-cols-7">
      {weekDays.map((dateStr) => {
        const dayDate = new Date(dateStr + "T12:00:00");
        const isToday = dateStr === today;
        const entries = getEntriesForDay(dateStr);
        const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });
        const dayNum = dayDate.getDate();
        const monthName = dayDate.toLocaleDateString("en-US", { month: "short" });

        return (
          <div
            key={dateStr}
            onClick={() => onDayClick(dateStr)}
            className="min-h-[280px] border-r border-slate-100 last:border-r-0 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            {/* Day header */}
            <div className={`px-2 py-2 border-b border-slate-100 text-center ${isToday ? "bg-[#7BC143]/5" : ""}`}>
              <div className="text-xs text-slate-400 uppercase">{dayName}</div>
              <div
                className={`text-lg font-semibold inline-flex items-center justify-center w-8 h-8 rounded-full ${
                  isToday ? "bg-[#7BC143] text-white" : "text-slate-800"
                }`}
              >
                {dayNum}
              </div>
              <div className="text-[10px] text-slate-400">{monthName}</div>
            </div>

            {/* Entries */}
            <div className="p-1.5 space-y-1">
              {/* Scheduled projects */}
              {entries.scheduledProjects.map((sp) => {
                const firstType = (sp.project?.type || "").split(",")[0].trim().toUpperCase();
                const colors = PROJECT_COLORS[firstType] || "bg-slate-100 text-slate-600 border-slate-200";
                return (
                  <div
                    key={`p-${sp.project?.id}`}
                    className={`text-[11px] leading-snug px-2 py-1.5 rounded-lg border ${colors}`}
                  >
                    <div className="font-semibold truncate">{sp.project?.name || "?"}</div>
                    {sp.project?.projectNumber && (
                      <div className="opacity-50 text-[10px]">{sp.project.projectNumber}</div>
                    )}
                    <div className="flex items-center gap-1 mt-0.5 opacity-60">
                      <Users size={10} />
                      <span>{sp.workers.length} worker{sp.workers.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="text-[9px] opacity-40 mt-0.5 truncate">
                      {sp.workers.map((w: any) => w.name?.split(" ")[0]).join(", ")}
                    </div>
                  </div>
                );
              })}

              {/* Time-off */}
              {entries.timeOffs.map((to: any) => {
                const colors = TIMEOFF_COLORS[to.type] || "bg-blue-100 text-blue-700";
                const statusDot = to.status === "pending" ? "bg-yellow-400" : to.status === "approved" ? "bg-green-400" : "bg-red-400";
                const typeKey = to.type === "jury_duty" ? "juryDuty" : to.type;
                return (
                  <div
                    key={`t-${to.id}`}
                    className={`text-[11px] leading-snug px-2 py-1 rounded-lg ${colors}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
                      <span className="font-semibold truncate">{to.worker?.name || "?"}</span>
                    </div>
                    <div className="opacity-75">{t(`timeoff.${typeKey}`)}</div>
                  </div>
                );
              })}

              {/* Events */}
              {entries.events.map((ev: any) => (
                <div
                  key={`e-${ev.id}`}
                  className="text-[11px] leading-snug px-2 py-1 rounded-lg"
                  style={{ backgroundColor: ev.color + "20", color: ev.color }}
                >
                  <div className="font-semibold truncate">{ev.title}</div>
                  {!ev.allDay && ev.startTime && (
                    <div className="opacity-75">{ev.startTime}{ev.endTime ? ` - ${ev.endTime}` : ""}</div>
                  )}
                </div>
              ))}

              {entries.scheduledProjects.length === 0 && entries.timeOffs.length === 0 && entries.events.length === 0 && (
                <div className="text-[10px] text-slate-300 text-center py-4">{t("calendar.noEntries")}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
