"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Sparkles, CalendarDays, ShieldCheck, XCircle, Clock } from "lucide-react";
import ScheduleTimelineView from "./ScheduleTimelineView";
import CalendarWeekView from "./CalendarWeekView";
import WorkerPanel from "./WorkerPanel";
import ScheduleModal from "./ScheduleModal";
import AIAutoScheduleModal from "./AIAutoScheduleModal";
import AIWeekScheduleModal from "./AIWeekScheduleModal";

type Cert = { id: string; name: string; expires: string | null; status: string };
type Worker = { id: string; name: string; role: string; city: string | null; state: string | null; types: string[]; certifications?: Cert[] };
type Project = { id: string; name: string; type: string; status: string; projectNumber?: string; address: string; startDate: string | null; estEndDate: string | null; isSubbedOut?: boolean; subContractorId?: string | null };
type Entry = {
  id: string;
  workerId: string;
  projectId: string;
  date: string;
  shift?: string;
  hours?: number;
  notes: string | null;
  worker: Worker | null;
  project: Project | null;
};

type PendingWeek = {
  weekStart: string;
  status: string;
  createdBy?: string;
  createdAt?: string;
};

export default function ScheduleCalendarView({
  projects,
  workers,
  initialEntries,
  userRole,
}: {
  projects: Project[];
  workers: Worker[];
  initialEntries: Entry[];
  userRole?: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<"timeline" | "week">("timeline");
  const [current, setCurrent] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [weekModalOpen, setWeekModalOpen] = useState(false);
  const [pendingWeeks, setPendingWeeks] = useState<PendingWeek[]>([]);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  const isAdminUser = userRole === "ADMIN";

  // Load pending schedule weeks for approval banner
  useEffect(() => {
    async function loadPendingWeeks() {
      try {
        const res = await fetch("/api/schedule/approve");
        if (res.ok) {
          const data = await res.json();
          setPendingWeeks(Array.isArray(data) ? data : []);
        }
      } catch { /* ignore */ }
    }
    loadPendingWeeks();
  }, []);

  async function handleApprove(weekStart: string) {
    setApproving(weekStart);
    try {
      const res = await fetch("/api/schedule/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, action: "approve" }),
      });
      if (res.ok) {
        setPendingWeeks((prev) => prev.filter((w) => w.weekStart !== weekStart));
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to approve");
      }
    } catch {
      alert("Network error");
    } finally {
      setApproving(null);
    }
  }

  async function handleReject(weekStart: string) {
    setApproving(weekStart);
    try {
      const res = await fetch("/api/schedule/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, action: "reject", rejectedNote: rejectNote }),
      });
      if (res.ok) {
        setPendingWeeks((prev) => prev.filter((w) => w.weekStart !== weekStart));
        setShowRejectInput(null);
        setRejectNote("");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reject");
      }
    } catch {
      alert("Network error");
    } finally {
      setApproving(null);
    }
  }

  function navigate(delta: number) {
    const d = new Date(current);
    d.setDate(d.getDate() + delta * 7);
    setCurrent(d);
  }

  function goToday() {
    setCurrent(new Date());
  }

  // Week label for the week view
  const weekStart = new Date(current);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  function handleDayClick(dateStr: string) {
    setPrefillDate(dateStr);
    setEditEntry(null);
    setModalOpen(true);
  }

  function handleEntryClick(entry: Entry) {
    setEditEntry(entry);
    setPrefillDate(null);
    setModalOpen(true);
  }

  async function handleSave(data: any) {
    if (editEntry) {
      await fetch(`/api/schedule/${editEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setModalOpen(false);
    setEditEntry(null);
    setPrefillDate(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this assignment?")) return;
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    setModalOpen(false);
    setEditEntry(null);
    router.refresh();
  }

  async function handleClearDay(dateStr: string) {
    const dayEntries = initialEntries.filter((e) => e.date === dateStr);
    if (dayEntries.length === 0) return;
    const dayLabel = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!confirm(`Clear all ${dayEntries.length} assignment(s) on ${dayLabel}?`)) return;
    await Promise.all(dayEntries.map((e) => fetch(`/api/schedule/${e.id}`, { method: "DELETE" })));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Approval Banners — shown to ADMIN (General Manager) */}
      {isAdminUser && pendingWeeks.length > 0 && (
        <div className="space-y-2">
          {pendingWeeks.map((week) => {
            const mondayDate = new Date(week.weekStart + "T12:00:00");
            const fridayDate = new Date(mondayDate);
            fridayDate.setDate(fridayDate.getDate() + 4);
            const weekLabel = `${mondayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${fridayDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

            return (
              <div key={week.weekStart} className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Draft schedule awaiting your approval
                      </p>
                      <p className="text-xs text-amber-700">
                        Week of {weekLabel}
                      </p>
                    </div>
                  </div>

                  {showRejectInput === week.weekStart ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Reason (optional)"
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg w-48 focus:ring-2 focus:ring-red-300 focus:border-red-300 outline-none"
                      />
                      <button
                        onClick={() => handleReject(week.weekStart)}
                        disabled={approving === week.weekStart}
                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                      >
                        Confirm Reject
                      </button>
                      <button
                        onClick={() => { setShowRejectInput(null); setRejectNote(""); }}
                        className="px-2 py-1.5 text-sm text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(week.weekStart)}
                        disabled={approving === week.weekStart}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 font-medium transition"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => setShowRejectInput(week.weekStart)}
                        disabled={approving === week.weekStart}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-white text-red-600 border border-red-200 rounded-full hover:bg-red-50 disabled:opacity-50 font-medium transition"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Non-admin: show pending status info */}
      {!isAdminUser && pendingWeeks.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <p className="text-sm text-blue-800">
              {pendingWeeks.length} draft schedule{pendingWeeks.length > 1 ? "s" : ""} pending GM approval
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 space-y-3">
        {/* Top row: view toggle + navigation/hint */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("timeline")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                view === "timeline" ? "bg-[#7BC143] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                view === "week" ? "bg-[#7BC143] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Week
            </button>
          </div>

          {view === "week" && (
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 text-center">
                {weekLabel}
              </span>
              <button onClick={() => navigate(1)} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                <ChevronRight size={18} />
              </button>
              <button onClick={goToday} className="px-2 py-1 text-xs font-medium text-[#7BC143] hover:bg-[#7BC143] hover:bg-opacity-10 rounded-full">
                Today
              </button>
            </div>
          )}

          {view === "timeline" && (
            <div className="text-xs text-slate-500 hidden sm:block">
              Drag workers from the panel onto project rows
            </div>
          )}
        </div>

        {/* Bottom row: action buttons — wrap on mobile */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7BC143] bg-[#7BC143] bg-opacity-10 border border-[#7BC143] border-opacity-30 rounded-full hover:bg-opacity-20"
          >
            <Sparkles size={14} /> AI Project
          </button>
          <button
            onClick={() => setWeekModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full hover:bg-indigo-100 transition"
          >
            <CalendarDays size={14} /> AI Week
          </button>
          <button
            onClick={() => { setPrefillDate(null); setEditEntry(null); setModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#7BC143] rounded-full hover:bg-[#6aad38] ml-auto"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Main content */}
      {view === "timeline" ? (
        <div className="flex gap-3 overflow-x-auto">
          <WorkerPanel
            workers={workers}
            collapsed={panelCollapsed}
            onToggle={() => setPanelCollapsed(!panelCollapsed)}
          />
          <div className="flex-1 min-w-0 overflow-x-auto">
            <ScheduleTimelineView
              projects={projects}
              entries={initialEntries}
              onEntryClick={handleEntryClick}
              onClearDay={handleClearDay}
            />
          </div>
        </div>
      ) : (
        <CalendarWeekView
          date={current}
          entries={initialEntries}
          workers={workers}
          onDayClick={handleDayClick}
          onEntryClick={handleEntryClick}
          onClearDay={handleClearDay}
        />
      )}

      {/* AI Week Schedule Modal */}
      {weekModalOpen && (
        <AIWeekScheduleModal
          onClose={() => setWeekModalOpen(false)}
          onCreated={() => router.refresh()}
        />
      )}

      {/* AI Auto-Schedule Modal (single project) */}
      {aiModalOpen && (
        <AIAutoScheduleModal
          projects={projects}
          onClose={() => setAiModalOpen(false)}
          onCreated={() => router.refresh()}
        />
      )}

      {/* Modal */}
      {modalOpen && (
        <ScheduleModal
          entry={editEntry}
          prefillDate={prefillDate}
          projects={projects}
          workers={workers}
          existingEntries={initialEntries}
          onSave={handleSave}
          onDelete={editEntry ? () => handleDelete(editEntry.id) : undefined}
          onClose={() => { setModalOpen(false); setEditEntry(null); setPrefillDate(null); }}
        />
      )}
    </div>
  );
}
