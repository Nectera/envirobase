"use client";

import { useTranslation } from "@/components/LanguageProvider";
import {
  X, Check, XCircle, Trash2, Pencil, Palmtree, Plus, CalendarDays, Users,
} from "lucide-react";

const PROJECT_COLORS: Record<string, string> = {
  ASBESTOS: "bg-indigo-50 border-indigo-200 text-indigo-700",
  LEAD: "bg-amber-50 border-amber-200 text-amber-700",
  METH: "bg-red-50 border-red-200 text-red-700",
  MOLD: "bg-teal-50 border-teal-200 text-teal-700",
  SELECT_DEMO: "bg-orange-50 border-orange-200 text-orange-700",
  REBUILD: "bg-violet-50 border-violet-200 text-violet-700",
};

interface ScheduledProject {
  project: any;
  workers: any[];
  entries: any[];
}

interface DayDetailModalProps {
  dateStr: string;
  entries: { scheduledProjects: ScheduledProject[]; timeOffs: any[]; events: any[] };
  isAdmin: boolean;
  onClose: () => void;
  onApproveTimeOff: (id: string) => void;
  onDenyTimeOff: (id: string, reason: string) => void;
  onDeleteTimeOff: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onEditEvent: (event: any) => void;
  onRequestTimeOff: () => void;
  onAddEvent: () => void;
}

export default function DayDetailModal({
  dateStr, entries, isAdmin, onClose,
  onApproveTimeOff, onDenyTimeOff, onDeleteTimeOff,
  onDeleteEvent, onEditEvent, onRequestTimeOff, onAddEvent,
}: DayDetailModalProps) {
  const { t } = useTranslation();
  const date = new Date(dateStr + "T12:00:00");
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const total = entries.scheduledProjects.length + entries.timeOffs.length + entries.events.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{formattedDate}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {total} {total === 1 ? "entry" : "entries"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Scheduled Projects Section */}
          {entries.scheduledProjects.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {t("sidebar.projects")} ({entries.scheduledProjects.length})
              </h4>
              <div className="space-y-2">
                {entries.scheduledProjects.map((sp) => {
                  const firstType = (sp.project?.type || "").split(",")[0].trim().toUpperCase();
                  const colors = PROJECT_COLORS[firstType] || "bg-slate-50 border-slate-200 text-slate-700";
                  return (
                    <div key={sp.project?.id} className={`px-3 py-2.5 rounded-xl border ${colors}`}>
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{sp.project?.name || "Unknown"}</div>
                        <span className="text-[10px] uppercase font-semibold opacity-50">
                          {sp.project?.type?.replace("_", " ")}
                        </span>
                      </div>
                      {sp.project?.projectNumber && (
                        <div className="text-xs opacity-60 mt-0.5">{sp.project.projectNumber}</div>
                      )}
                      {sp.project?.address && (
                        <div className="text-xs opacity-50 mt-0.5">{sp.project.address}</div>
                      )}

                      {/* Crew */}
                      <div className="mt-2 flex items-center gap-1.5">
                        <Users size={12} className="opacity-50" />
                        <span className="text-xs opacity-60">
                          {sp.workers.length} worker{sp.workers.length !== 1 ? "s" : ""}:
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {sp.workers.map((w: any) => (
                          <span
                            key={w.id}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 border border-current/10"
                          >
                            {w.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time Off Section */}
          {entries.timeOffs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {t("calendar.timeoff")} ({entries.timeOffs.length})
              </h4>
              <div className="space-y-2">
                {entries.timeOffs.map((to: any) => {
                  const statusColors = {
                    pending: "bg-yellow-50 border-yellow-200",
                    approved: "bg-green-50 border-green-200",
                    denied: "bg-red-50 border-red-200",
                  }[to.status as string] || "bg-slate-50 border-slate-200";

                  const statusBadge = {
                    pending: "bg-yellow-100 text-yellow-700",
                    approved: "bg-green-100 text-green-700",
                    denied: "bg-red-100 text-red-700",
                  }[to.status as string] || "bg-slate-100 text-slate-600";

                  const typeKey = to.type === "jury_duty" ? "juryDuty" : to.type;

                  return (
                    <div key={to.id} className={`px-3 py-2.5 rounded-xl border ${statusColors}`}>
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm text-slate-800">{to.worker?.name || "Unknown"}</div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge}`}>
                          {t(`timeoff.${to.status}`)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {t(`timeoff.${typeKey}`)} &middot; {to.startDate} &rarr; {to.endDate}
                      </div>
                      {to.reason && <div className="text-xs text-slate-500 mt-1">{to.reason}</div>}

                      {/* Admin actions for pending */}
                      {isAdmin && to.status === "pending" && (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => onApproveTimeOff(to.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <Check size={12} /> {t("timeoff.approve")}
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt("Denial reason:");
                              if (reason !== null) onDenyTimeOff(to.id, reason);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <XCircle size={12} /> {t("timeoff.deny")}
                          </button>
                        </div>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => onDeleteTimeOff(to.id)}
                          className="flex items-center gap-1 mt-2 px-2 py-0.5 text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Events Section */}
          {entries.events.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {t("calendar.events")} ({entries.events.length})
              </h4>
              <div className="space-y-2">
                {entries.events.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="px-3 py-2.5 rounded-xl border"
                    style={{
                      backgroundColor: ev.color + "10",
                      borderColor: ev.color + "40",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm" style={{ color: ev.color }}>
                        {ev.title}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {ev.allDay ? t("calendar.events.allDay") : `${ev.startTime || ""} - ${ev.endTime || ""}`}
                      </span>
                    </div>
                    {ev.description && <div className="text-xs text-slate-600 mt-1">{ev.description}</div>}
                    {ev.office && (
                      <div className="text-[10px] text-slate-400 mt-1">
                        {ev.office === "greeley" ? "Greeley" : "Grand Junction"} office
                      </div>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => onEditEvent(ev)}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil size={11} /> Edit
                        </button>
                        <button
                          onClick={() => onDeleteEvent(ev.id)}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {total === 0 && (
            <div className="text-center py-8">
              <CalendarDays size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">{t("calendar.noEntries")}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {isAdmin && (
          <div className="border-t border-slate-100 px-5 py-3 flex items-center gap-2">
            <button
              onClick={onAddEvent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#7BC143]/10 text-[#7BC143] rounded-lg hover:bg-[#7BC143]/20 transition-colors"
            >
              <Plus size={13} /> {t("calendar.events.create")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
