"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/LanguageProvider";
import {
  ChevronLeft, ChevronRight, CalendarDays, Plus,
  Palmtree, FolderOpen, CalendarCheck, User as UserIcon, Users,
  CheckSquare,
} from "lucide-react";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayDetailModal from "./DayDetailModal";
import TimeOffRequestModal from "./TimeOffRequestModal";
import EventModal from "./EventModal";

interface ProjectScheduleItem {
  project: any;
  workers: any[];
  entries: any[];
}

interface CalendarViewProps {
  projectScheduleMap: Record<string, Record<string, ProjectScheduleItem>>;
  timeOffEntries: any[];
  calendarEvents: any[];
  workers: any[];
  projects: any[];
  tasks: any[];
  userRole: string;
  userId: string;
  userWorkerId: string | null;
}

export default function CalendarView({
  projectScheduleMap, timeOffEntries, calendarEvents, workers, projects, tasks, userRole, userId, userWorkerId,
}: CalendarViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const isAdmin = userRole === "ADMIN" || userRole === "SUPERVISOR";

  // State
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingTimeOff, setEditingTimeOff] = useState<any>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [showFilters, setShowFilters] = useState({ projects: true, timeOff: true, events: true, tasks: true });
  const [calendarScope, setCalendarScope] = useState<"all" | "mine">("all");

  // Navigation
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  const goNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const monthLabel = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Get entries for a specific day (filtered by scope)
  const getEntriesForDay = useCallback((dateStr: string) => {
    const isMine = calendarScope === "mine" && userWorkerId;

    let scheduledProjects = showFilters.projects
      ? Object.values(projectScheduleMap[dateStr] || {})
      : [];
    let timeOffs = showFilters.timeOff
      ? timeOffEntries.filter((e: any) => e.startDate <= dateStr && e.endDate >= dateStr)
      : [];
    const events = showFilters.events
      ? calendarEvents.filter((e: any) => e.startDate <= dateStr && e.endDate >= dateStr)
      : [];
    const dayTasks = showFilters.tasks
      ? tasks.filter((t: any) => t.dueDate === dateStr)
      : [];

    // Apply "My Calendar" filtering
    if (isMine) {
      scheduledProjects = scheduledProjects.filter((sp) =>
        sp.workers.some((w: any) => w.id === userWorkerId)
      );
      timeOffs = timeOffs.filter((e: any) => e.workerId === userWorkerId);
    }

    // Filter tasks to user when in "mine" mode
    const filteredTasks = isMine
      ? dayTasks.filter((t: any) => t.assignedTo === userWorkerId || t.createdBy === userId)
      : dayTasks;

    return { scheduledProjects, timeOffs, events, tasks: filteredTasks };
  }, [projectScheduleMap, timeOffEntries, calendarEvents, tasks, showFilters, calendarScope, userWorkerId, userId]);

  // CRUD handlers
  const handleCreateTimeOff = async (data: any) => {
    await fetch("/api/timeoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
    setShowTimeOffModal(false);
  };

  const handleUpdateTimeOff = async (id: string, data: any) => {
    await fetch(`/api/timeoff/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
    setEditingTimeOff(null);
  };

  const handleDeleteTimeOff = async (id: string) => {
    await fetch(`/api/timeoff/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const handleCreateEvent = async (data: any) => {
    await fetch("/api/calendar-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
    setShowEventModal(false);
  };

  const handleUpdateEvent = async (id: string, data: any) => {
    await fetch(`/api/calendar-events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
    setEditingEvent(null);
  };

  const handleDeleteEvent = async (id: string) => {
    await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const toggleFilter = (key: keyof typeof showFilters) => {
    setShowFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("calendar.title")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("calendar.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#7BC143]/10 text-[#7BC143] rounded-xl hover:bg-[#7BC143]/20 transition-colors"
            >
              <Plus size={14} />
              {t("calendar.events.create")}
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 space-y-3">
        {/* Top row: date nav + view toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button onClick={goPrev} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <button
              onClick={goToday}
              className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              {t("calendar.today")}
            </button>
            <button onClick={goNext} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight size={18} className="text-slate-600" />
            </button>
            <h2 className="text-sm font-semibold text-slate-800 ml-1">{monthLabel}</h2>
          </div>

          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setViewMode("month")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "month" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {t("calendar.monthView")}
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {t("calendar.weekView")}
            </button>
          </div>
        </div>

        {/* Scope toggle + Filter chips */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          {/* My Calendar / All toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setCalendarScope("all")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                calendarScope === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              <Users size={11} />
              All
            </button>
            <button
              onClick={() => setCalendarScope("mine")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                calendarScope === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              <UserIcon size={11} />
              My Calendar
            </button>
          </div>

          <div className="w-px h-5 bg-slate-200 shrink-0" />

          {/* Filter chips */}
          <button
            onClick={() => toggleFilter("projects")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors shrink-0 ${
              showFilters.projects
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <FolderOpen size={12} />
            {t("sidebar.projects")}
          </button>
          <button
            onClick={() => toggleFilter("timeOff")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors shrink-0 ${
              showFilters.timeOff
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <Palmtree size={12} />
            {t("calendar.timeoff")}
          </button>
          <button
            onClick={() => toggleFilter("events")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors shrink-0 ${
              showFilters.events
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <CalendarDays size={12} />
            {t("calendar.events")}
          </button>
          <button
            onClick={() => toggleFilter("tasks")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors shrink-0 ${
              showFilters.tasks
                ? "bg-purple-50 border-purple-200 text-purple-700"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <CheckSquare size={12} />
            Tasks
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {viewMode === "month" ? (
          <MonthView
            currentDate={currentDate}
            getEntriesForDay={getEntriesForDay}
            onDayClick={(dateStr: string) => setSelectedDay(dateStr)}
          />
        ) : (
          <WeekView
            currentDate={currentDate}
            getEntriesForDay={getEntriesForDay}
            onDayClick={(dateStr: string) => setSelectedDay(dateStr)}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-1">
        <LegendItem color="bg-indigo-200" label="Asbestos" />
        <LegendItem color="bg-amber-200" label="Lead" />
        <LegendItem color="bg-red-200" label="Meth" />
        <LegendItem color="bg-teal-200" label="Mold" />
        <LegendItem color="bg-orange-200" label="Demo" />
        <LegendItem color="bg-violet-200" label="Rebuild" />
        <LegendItem color="bg-blue-200" label={t("calendar.timeoff")} />
        <LegendItem color="bg-emerald-200" label={t("calendar.events")} />
        <LegendItem color="bg-purple-200" label="Tasks" />
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <DayDetailModal
          dateStr={selectedDay}
          entries={getEntriesForDay(selectedDay)}
          isAdmin={isAdmin}
          onClose={() => setSelectedDay(null)}
          onApproveTimeOff={(id) => handleUpdateTimeOff(id, { status: "approved" })}
          onDenyTimeOff={(id, reason) => handleUpdateTimeOff(id, { status: "denied", deniedReason: reason })}
          onDeleteTimeOff={handleDeleteTimeOff}
          onDeleteEvent={handleDeleteEvent}
          onEditEvent={(event) => { setEditingEvent(event); setSelectedDay(null); }}
          onRequestTimeOff={() => { setShowTimeOffModal(true); setSelectedDay(null); }}
          onAddEvent={() => { setShowEventModal(true); setSelectedDay(null); }}
        />
      )}

      {/* Time Off Modal */}
      {(showTimeOffModal || editingTimeOff) && (
        <TimeOffRequestModal
          isAdmin={isAdmin}
          workers={workers}
          userId={userId}
          editing={editingTimeOff}
          prefilledDate={selectedDay}
          onSubmit={editingTimeOff
            ? (data: any) => handleUpdateTimeOff(editingTimeOff.id, data)
            : handleCreateTimeOff}
          onClose={() => { setShowTimeOffModal(false); setEditingTimeOff(null); }}
        />
      )}

      {/* Event Modal */}
      {(showEventModal || editingEvent) && (
        <EventModal
          editing={editingEvent}
          prefilledDate={selectedDay}
          onSubmit={editingEvent
            ? (data: any) => handleUpdateEvent(editingEvent.id, data)
            : handleCreateEvent}
          onClose={() => { setShowEventModal(false); setEditingEvent(null); }}
        />
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded ${color}`} />
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
