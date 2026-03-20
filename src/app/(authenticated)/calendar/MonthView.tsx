"use client";

import { useMemo } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import { Users, CheckSquare } from "lucide-react";

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

interface MonthViewProps {
  currentDate: Date;
  getEntriesForDay: (dateStr: string) => { scheduledProjects: ScheduledProject[]; timeOffs: any[]; events: any[]; tasks?: any[] };
  onDayClick: (dateStr: string) => void;
}

export default function MonthView({ currentDate, getEntriesForDay, onDayClick }: MonthViewProps) {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];

  const weeks = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0=Sun
    const start = new Date(year, month, 1 - startOffset);

    const result: string[][] = [];
    const cursor = new Date(start);
    for (let w = 0; w < 6; w++) {
      const week: string[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(cursor.toISOString().split("T")[0]);
        cursor.setDate(cursor.getDate() + 1);
      }
      result.push(week);
    }
    return result;
  }, [currentDate]);

  const currentMonth = currentDate.getMonth();

  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {dayHeaders.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
          {week.map((dateStr) => {
            const dayDate = new Date(dateStr + "T12:00:00");
            const dayNum = dayDate.getDate();
            const isCurrentMonth = dayDate.getMonth() === currentMonth;
            const isToday = dateStr === today;
            const entries = getEntriesForDay(dateStr);
            const totalItems = entries.scheduledProjects.length + entries.timeOffs.length + entries.events.length + (entries.tasks?.length || 0);
            const maxShow = 5;
            let shown = 0;

            return (
              <div
                key={dateStr}
                onClick={() => onDayClick(dateStr)}
                className={`min-h-[140px] p-1.5 border-r border-slate-100 last:border-r-0 cursor-pointer transition-colors hover:bg-slate-50 ${
                  !isCurrentMonth ? "bg-slate-50/50" : ""
                }`}
              >
                {/* Date number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? "bg-[#7BC143] text-white"
                        : isCurrentMonth
                        ? "text-slate-700"
                        : "text-slate-300"
                    }`}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* Entry pills */}
                <div className="space-y-0.5">
                  {/* Scheduled projects */}
                  {entries.scheduledProjects.map((sp) => {
                    if (shown >= maxShow - (totalItems > maxShow ? 1 : 0)) return null;
                    shown++;
                    // Use first type for color (supports multi-type projects like "ASBESTOS,LEAD")
                    const firstType = (sp.project?.type || "").split(",")[0].trim().toUpperCase();
                    const colors = PROJECT_COLORS[firstType] || "bg-slate-100 text-slate-600 border-slate-200";
                    return (
                      <div
                        key={`p-${sp.project?.id}`}
                        className={`text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate flex items-center gap-1 ${colors}`}
                      >
                        <span className="truncate font-medium">{sp.project?.name?.slice(0, 14) || "?"}</span>
                        <span className="flex items-center gap-0.5 flex-shrink-0 opacity-60">
                          <Users size={8} />{sp.workers.length}
                        </span>
                      </div>
                    );
                  })}

                  {/* Time-off entries */}
                  {entries.timeOffs.map((to: any) => {
                    if (shown >= maxShow - (totalItems > maxShow ? 1 : 0)) return null;
                    shown++;
                    const colors = TIMEOFF_COLORS[to.type] || "bg-blue-100 text-blue-700";
                    const statusDot = to.status === "pending" ? "bg-yellow-400" : to.status === "approved" ? "bg-green-400" : "bg-red-400";
                    const typeKey = to.type === "jury_duty" ? "juryDuty" : to.type;
                    return (
                      <div
                        key={`t-${to.id}`}
                        className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${colors}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
                        {to.worker?.name?.split(" ")[0] || "?"} - {t(`timeoff.${typeKey}`)}
                      </div>
                    );
                  })}

                  {/* Calendar events */}
                  {entries.events.map((ev: any) => {
                    if (shown >= maxShow - (totalItems > maxShow ? 1 : 0)) return null;
                    shown++;
                    return (
                      <div
                        key={`e-${ev.id}`}
                        className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate flex items-center gap-1"
                        style={{ backgroundColor: ev.color + "20", color: ev.color }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ev.color }}
                        />
                        {ev.title}
                      </div>
                    );
                  })}

                  {/* Tasks */}
                  {(entries.tasks || []).map((task: any) => {
                    if (shown >= maxShow - (totalItems > maxShow ? 1 : 0)) return null;
                    shown++;
                    const priorityColors: Record<string, string> = {
                      high: "bg-purple-100 text-purple-700 border-purple-200",
                      medium: "bg-purple-50 text-purple-600 border-purple-200",
                      low: "bg-purple-50/50 text-purple-500 border-purple-100",
                    };
                    const colors = priorityColors[task.priority] || priorityColors.medium;
                    return (
                      <div
                        key={`task-${task.id}`}
                        className={`text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate flex items-center gap-1 ${colors}`}
                      >
                        <CheckSquare size={8} className="flex-shrink-0" />
                        <span className="truncate">{task.title}</span>
                      </div>
                    );
                  })}

                  {/* Overflow count */}
                  {totalItems > maxShow && (
                    <div className="text-[10px] text-slate-400 px-1.5 font-medium">
                      +{totalItems - (maxShow - 1)} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
