"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Clock, Users, AlertTriangle, CheckCircle2, Flag, ChevronDown, ChevronRight,
  Download, FileText, Search, Filter, ArrowLeft, DollarSign, CalendarDays,
  BarChart3, Eye, Check, X as XIcon, MapPin, Pencil, Save, Loader2, Trash2,
  Plus,
} from "lucide-react";

type Worker = {
  id: string;
  name: string;
  role?: string;
  position?: string;
};

type TimeEntryRow = {
  id: string;
  workerId: string;
  worker: Worker;
  projectId?: string | null;
  project?: { id: string; name: string; projectNumber?: string } | null;
  date: string;
  clockIn: string;
  clockOut: string | null;
  hours: number | null;
  notes?: string;
  approvalStatus: string;
  flagReason?: string | null;
  overtime: boolean;
  clockInAddress?: string;
  clockOutAddress?: string;
  clockInDistance?: number;
  clockOutDistance?: number;
};

export default function PayrollHub({
  workers,
  timeEntries,
  activeClockIns,
  periodStart,
  periodEnd,
  userId,
}: {
  workers: Worker[];
  timeEntries: TimeEntryRow[];
  activeClockIns: TimeEntryRow[];
  periodStart: string;
  periodEnd: string;
  userId: string;
}) {
  const [tab, setTab] = useState<"dashboard" | "review" | "reports" | "workers">("dashboard");
  const [startDate, setStartDate] = useState(periodStart);
  const [endDate, setEndDate] = useState(periodEnd);
  const [entries, setEntries] = useState<TimeEntryRow[]>(timeEntries);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "flagged">("all");
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntryRow | null>(null);

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<TimeEntryRow | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Bulk add modal state
  type BulkRow = { workerId: string; date: string; clockIn: string; clockOut: string; notes: string };
  const emptyBulkRow = (): BulkRow => ({ workerId: "", date: "", clockIn: "07:00", clockOut: "15:30", notes: "" });
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyBulkRow()]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkSuccess, setBulkSuccess] = useState(0);
  const [skipLunch, setSkipLunch] = useState(false);

  const updateBulkRow = (index: number, field: keyof BulkRow, value: string) => {
    setBulkRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addBulkRow = () => {
    const last = bulkRows[bulkRows.length - 1];
    setBulkRows((prev) => [...prev, { workerId: "", date: last?.date || "", clockIn: last?.clockIn || "07:00", clockOut: last?.clockOut || "15:30", notes: last?.notes || "" }]);
  };

  const removeBulkRow = (index: number) => {
    if (bulkRows.length <= 1) return;
    setBulkRows((prev) => prev.filter((_, i) => i !== index));
  };

  const submitBulkEntries = async () => {
    setBulkSaving(true);
    setBulkErrors([]);
    setBulkSuccess(0);
    const errors: string[] = [];
    let successCount = 0;
    const newEntries: TimeEntryRow[] = [];

    for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i];
      if (!row.workerId || !row.date || !row.clockIn || !row.clockOut) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }
      const clockInISO = new Date(`${row.date}T${row.clockIn}:00`).toISOString();
      const clockOutISO = new Date(`${row.date}T${row.clockOut}:00`).toISOString();

      try {
        const res = await fetch("/api/time-clock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workerId: row.workerId,
            clockIn: clockInISO,
            clockOut: clockOutISO,
            notes: row.notes || "Manual entry (bulk add)",
            entryType: "project",
            skipLunchDeduction: skipLunch,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          const worker = workers.find((w) => w.id === row.workerId);
          newEntries.push({
            id: created.id,
            workerId: row.workerId,
            worker: worker || { id: row.workerId, name: "Unknown" },
            projectId: created.projectId || null,
            project: null,
            date: created.date || row.date,
            clockIn: created.clockIn,
            clockOut: created.clockOut,
            hours: created.hours,
            notes: created.notes || row.notes,
            approvalStatus: created.approvalStatus || "pending",
            flagReason: null,
            overtime: (created.hours || 0) > 8,
          });
          successCount++;
        } else {
          const err = await res.json().catch(() => ({}));
          const workerName = workers.find((w) => w.id === row.workerId)?.name || "Unknown";
          errors.push(`Row ${i + 1} (${workerName}): ${err.error || "Failed to create"}`);
        }
      } catch {
        errors.push(`Row ${i + 1}: Network error`);
      }
    }

    if (newEntries.length > 0) {
      setEntries((prev) => [...newEntries, ...prev]);
    }
    setBulkSuccess(successCount);
    setBulkErrors(errors);
    setBulkSaving(false);

    if (errors.length === 0 && successCount > 0) {
      setTimeout(() => {
        setShowBulkAdd(false);
        setBulkRows([emptyBulkRow()]);
        setBulkSuccess(0);
        setBulkErrors([]);
      }, 1500);
    }
  };

  const openEditModal = (entry: TimeEntryRow) => {
    setEditingEntry(entry);
    // Format ISO to datetime-local value (YYYY-MM-DDTHH:MM)
    const toLocal = (iso: string | null) => {
      if (!iso) return "";
      const d = new Date(iso);
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60000);
      return local.toISOString().slice(0, 16);
    };
    setEditClockIn(toLocal(entry.clockIn));
    setEditClockOut(toLocal(entry.clockOut));
    setEditNotes(entry.notes || "");
  };

  const saveEditedEntry = async () => {
    if (!editingEntry || !editClockIn) return;
    setEditSaving(true);
    try {
      const body: any = {
        clockIn: new Date(editClockIn).toISOString(),
        notes: editNotes,
      };
      if (editClockOut) {
        body.clockOut = new Date(editClockOut).toISOString();
      }
      const res = await fetch(`/api/time-clock/${editingEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setEntries((prev) =>
          prev.map((e) =>
            e.id === editingEntry.id
              ? { ...e, clockIn: updated.clockIn, clockOut: updated.clockOut, hours: updated.hours, notes: updated.notes || e.notes }
              : e
          )
        );
        setEditingEntry(null);
      }
    } catch {} finally {
      setEditSaving(false);
    }
  };

  // Compute stats
  const stats = useMemo(() => {
    const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0);
    const pendingCount = entries.filter((e) => (e.approvalStatus || "pending") === "pending").length;
    const approvedCount = entries.filter((e) => e.approvalStatus === "approved").length;
    const flaggedCount = entries.filter((e) => e.approvalStatus === "flagged").length;
    const overtimeEntries = entries.filter((e) => (e.hours || 0) > 8);
    const missedClockOuts = entries.filter((e) => e.clockIn && !e.clockOut);
    const uniqueWorkerIds = new Set(entries.map((e) => e.workerId));
    const uniqueDates = new Set(entries.map((e) => e.date));

    // Per-worker breakdown
    const workerMap = new Map<string, { worker: Worker; entries: TimeEntryRow[]; totalHours: number; daysWorked: number }>();
    entries.forEach((e) => {
      if (!workerMap.has(e.workerId)) {
        workerMap.set(e.workerId, { worker: e.worker, entries: [], totalHours: 0, daysWorked: 0 });
      }
      const w = workerMap.get(e.workerId)!;
      w.entries.push(e);
      w.totalHours += e.hours || 0;
    });
    workerMap.forEach((w) => {
      w.daysWorked = new Set(w.entries.map((e) => e.date)).size;
    });

    return {
      totalHours,
      pendingCount,
      approvedCount,
      flaggedCount,
      overtimeEntries,
      missedClockOuts,
      uniqueWorkers: uniqueWorkerIds.size,
      uniqueDays: uniqueDates.size,
      workerBreakdown: Array.from(workerMap.values()).sort((a, b) => b.totalHours - a.totalHours),
    };
  }, [entries]);

  // Fetch entries for date range
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/time-clock/payroll-report?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        // Reconstruct flat entries from the report
        const allEntries: TimeEntryRow[] = [];
        (data.workers || []).forEach((w: any) => {
          (w.entries || []).forEach((e: any) => {
            allEntries.push({
              ...e,
              worker: { id: w.workerId, name: w.workerName, role: w.workerRole },
              approvalStatus: e.approvalStatus || "pending",
              overtime: (e.hours || 0) > 8,
            });
          });
        });
        setEntries(allEntries);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  // Approve/flag entries
  const updateEntryStatus = async (entryId: string, status: "approved" | "flagged", reason?: string) => {
    try {
      const res = await fetch(`/api/time-clock/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: status, flagReason: reason || null }),
      });
      if (res.ok) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId ? { ...e, approvalStatus: status, flagReason: reason || null } : e
          )
        );
      }
    } catch {}
  };

  // Bulk approve all pending
  const approveAll = async () => {
    const pending = entries.filter((e) => (e.approvalStatus || "pending") === "pending" && e.clockOut);
    for (const entry of pending) {
      await updateEntryStatus(entry.id, "approved");
    }
  };

  // Delete a time entry
  const handleDeleteEntry = async (entryId: string, workerName: string) => {
    if (!confirm(`Delete this time entry for ${workerName}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/time-clock/${entryId}`, { method: "DELETE" });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
      } else {
        alert("Failed to delete entry");
      }
    } catch {
      alert("Failed to delete entry");
    }
  };

  // Filtered entries for review tab
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (filterStatus !== "all") {
      result = result.filter((e) => (e.approvalStatus || "pending") === filterStatus);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          e.worker?.name?.toLowerCase().includes(term) ||
          e.project?.name?.toLowerCase().includes(term) ||
          e.notes?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [entries, filterStatus, searchTerm]);

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch { return "—"; }
  };

  const formatDateLabel = (d: string) => {
    try {
      return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch { return d; }
  };

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { key: "review" as const, label: `Timesheet Review (${stats.pendingCount})`, icon: CheckCircle2 },
    { key: "reports" as const, label: "Reports & Export", icon: FileText },
    { key: "workers" as const, label: "Worker Breakdown", icon: Users },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-slate-400 hover:text-indigo-600">
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Payroll</h1>
          </div>
          <p className="text-sm text-slate-500">
            {formatDateLabel(startDate)} — {formatDateLabel(endDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg" />
          <span className="text-slate-400">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg" />
          <button onClick={fetchEntries} disabled={loading}
            className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
            {loading ? "Loading..." : "Update"}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${
                tab === t.key
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── Dashboard Tab ─── */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Hours" value={stats.totalHours.toFixed(1)} icon={Clock} color="indigo" />
            <StatCard label="Workers" value={stats.uniqueWorkers.toString()} icon={Users} color="emerald" />
            <StatCard label="Days Worked" value={stats.uniqueDays.toString()} icon={CalendarDays} color="blue" />
            <StatCard label="Avg Hrs/Worker" value={stats.uniqueWorkers > 0 ? (stats.totalHours / stats.uniqueWorkers).toFixed(1) : "0"} icon={BarChart3} color="amber" />
          </div>

          {/* Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stats.pendingCount > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100" onClick={() => { setTab("review"); setFilterStatus("pending"); }}>
                <Clock size={18} className="text-amber-600" />
                <div>
                  <div className="text-sm font-semibold text-amber-800">{stats.pendingCount} Pending Review</div>
                  <div className="text-[11px] text-amber-600">Click to review timesheets</div>
                </div>
              </div>
            )}
            {stats.flaggedCount > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100" onClick={() => { setTab("review"); setFilterStatus("flagged"); }}>
                <Flag size={18} className="text-red-600" />
                <div>
                  <div className="text-sm font-semibold text-red-800">{stats.flaggedCount} Flagged Entries</div>
                  <div className="text-[11px] text-red-600">Requires correction</div>
                </div>
              </div>
            )}
            {stats.overtimeEntries.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <AlertTriangle size={18} className="text-purple-600" />
                <div>
                  <div className="text-sm font-semibold text-purple-800">{stats.overtimeEntries.length} Overtime Entries</div>
                  <div className="text-[11px] text-purple-600">Entries exceeding 8 hours</div>
                </div>
              </div>
            )}
          </div>

          {/* Currently Clocked In */}
          {activeClockIns.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                Currently Clocked In ({activeClockIns.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {activeClockIns.map((te) => {
                  const elapsed = Math.round((Date.now() - new Date(te.clockIn).getTime()) / 3600000 * 10) / 10;
                  return (
                    <div key={te.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-emerald-100">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{te.worker?.name || "Unknown"}</div>
                        <div className="text-[10px] text-slate-500">{te.project?.name || "No project"}</div>
                      </div>
                      <div className="text-sm font-semibold text-emerald-700">{elapsed}h</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Workers Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-700">Worker Summary — This Period</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="text-left px-4 py-2 font-medium">Worker</th>
                    <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Role</th>
                    <th className="text-right px-4 py-2 font-medium">Hours</th>
                    <th className="text-right px-4 py-2 font-medium hidden md:table-cell">Days</th>
                    <th className="text-right px-4 py-2 font-medium hidden md:table-cell">Avg/Day</th>
                    <th className="text-center px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.workerBreakdown.map((wb) => {
                    const pendingCount = wb.entries.filter((e) => (e.approvalStatus || "pending") === "pending").length;
                    const flaggedCount = wb.entries.filter((e) => e.approvalStatus === "flagged").length;
                    const avgPerDay = wb.daysWorked > 0 ? wb.totalHours / wb.daysWorked : 0;
                    return (
                      <tr key={wb.worker.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setTab("workers"); setExpandedWorker(wb.worker.id); }}>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{wb.worker.name}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs hidden md:table-cell">{wb.worker.role || wb.worker.position || "—"}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{wb.totalHours.toFixed(1)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600 hidden md:table-cell">{wb.daysWorked}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600 hidden md:table-cell">{avgPerDay.toFixed(1)}</td>
                        <td className="px-4 py-2.5 text-center">
                          {flaggedCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded-full">
                              <Flag size={10} /> {flaggedCount}
                            </span>
                          ) : pendingCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
                              <Clock size={10} /> {pendingCount}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded-full">
                              <Check size={10} /> All approved
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Timesheet Review Tab ─── */}
      {tab === "review" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search worker or project..."
                  className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-64"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowBulkAdd(true); setBulkRows([emptyBulkRow()]); setBulkSuccess(0); setBulkErrors([]); setSkipLunch(false); }} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                <Plus size={14} /> Timesheets
              </button>
              <button onClick={approveAll} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                <CheckCircle2 size={14} /> Approve All Pending
              </button>
            </div>
          </div>

          {/* Entries Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Mobile: card layout */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-sm font-medium text-slate-900">{entry.worker?.name || "Unknown"}</div>
                    <StatusBadge status={entry.approvalStatus || "pending"} />
                  </div>
                  <div className="text-[11px] text-slate-500 mb-1">
                    {formatDateLabel(entry.date)} — {entry.project?.name || "No project"}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-600">
                      {formatTime(entry.clockIn)} — {formatTime(entry.clockOut)} · <span className="font-semibold">{(entry.hours || 0).toFixed(1)}h</span>
                      {(entry.hours || 0) > 8 && <span className="ml-1 text-purple-600 font-medium">OT</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditModal(entry)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit times">
                        <Pencil size={14} />
                      </button>
                      {(entry.approvalStatus || "pending") === "pending" && (
                        <>
                          <button onClick={() => updateEntryStatus(entry.id, "approved")} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                            <Check size={14} />
                          </button>
                          <button onClick={() => { const reason = prompt("Flag reason?"); if (reason) updateEntryStatus(entry.id, "flagged", reason); }} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <Flag size={14} />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDeleteEntry(entry.id, entry.worker?.name || "Unknown")} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {entry.flagReason && (
                    <div className="mt-1 text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded">{entry.flagReason}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: table layout */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="text-left px-4 py-2 font-medium">Worker</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Project</th>
                  <th className="text-left px-4 py-2 font-medium">Clock In</th>
                  <th className="text-left px-4 py-2 font-medium">Clock Out</th>
                  <th className="text-right px-4 py-2 font-medium">Hours</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                  <th className="text-center px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className={`hover:bg-slate-50 ${entry.approvalStatus === "flagged" ? "bg-red-50/50" : ""}`}>
                    <td className="px-4 py-2 font-medium text-slate-900">{entry.worker?.name || "Unknown"}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDateLabel(entry.date)}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs">{entry.project?.name || "—"}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {formatTime(entry.clockIn)}
                      {entry.clockInDistance != null && entry.clockInDistance > 0.5 && (
                        <span className="ml-1 text-amber-500" title={`${entry.clockInDistance.toFixed(1)} mi from site`}>
                          <MapPin size={10} className="inline" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {entry.clockOut ? formatTime(entry.clockOut) : (
                        <span className="text-amber-600 font-medium text-xs">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-700">
                      {(entry.hours || 0).toFixed(1)}
                      {(entry.hours || 0) > 8 && (
                        <span className="ml-1 text-[9px] font-bold text-purple-600 bg-purple-50 px-1 py-0.5 rounded">OT</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge status={entry.approvalStatus || "pending"} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEditModal(entry)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit times">
                          <Pencil size={14} />
                        </button>
                        {(entry.approvalStatus || "pending") === "pending" && entry.clockOut && (
                          <>
                            <button onClick={() => updateEntryStatus(entry.id, "approved")} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve">
                              <Check size={14} />
                            </button>
                            <button onClick={() => { const reason = prompt("Reason for flagging this entry?"); if (reason) updateEntryStatus(entry.id, "flagged", reason); }} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Flag">
                              <Flag size={14} />
                            </button>
                          </>
                        )}
                        {entry.approvalStatus === "flagged" && (
                          <button onClick={() => updateEntryStatus(entry.id, "approved")} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Resolve & Approve">
                            <Check size={14} />
                          </button>
                        )}
                        {entry.approvalStatus === "approved" && (
                          <span className="text-[10px] text-slate-400">Done</span>
                        )}
                        <button onClick={() => handleDeleteEntry(entry.id, entry.worker?.name || "Unknown")} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                      No time entries match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Reports Tab ─── */}
      {tab === "reports" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Export Payroll Data</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <a
                href={`/api/time-clock/payroll-report?startDate=${startDate}&endDate=${endDate}&format=csv`}
                download
                className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition"
              >
                <Download size={20} className="text-indigo-600" />
                <div>
                  <div className="text-sm font-medium text-slate-900">CSV Export</div>
                  <div className="text-[11px] text-slate-500">Download as spreadsheet</div>
                </div>
              </a>
              <a
                href={`/api/time-clock/payroll-report/pdf?startDate=${startDate}&endDate=${endDate}`}
                download
                className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition"
              >
                <FileText size={20} className="text-red-600" />
                <div>
                  <div className="text-sm font-medium text-slate-900">PDF Report</div>
                  <div className="text-[11px] text-slate-500">Formatted payroll report</div>
                </div>
              </a>
              <Link
                href="/time-clock/payroll"
                className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition"
              >
                <BarChart3 size={20} className="text-emerald-600" />
                <div>
                  <div className="text-sm font-medium text-slate-900">Detailed Report</div>
                  <div className="text-[11px] text-slate-500">Interactive payroll view</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Period Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.totalHours.toFixed(1)}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Total Hours</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.uniqueWorkers}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Workers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{stats.approvedCount}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Approved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{stats.pendingCount}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Pending</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Worker Drill-Down Tab ─── */}
      {tab === "workers" && (
        <div className="space-y-3">
          {stats.workerBreakdown.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <Users size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-semibold text-slate-700">No time entries for this period</h3>
              <p className="text-sm text-slate-500 mt-1">Adjust the date range to see worker data.</p>
            </div>
          ) : (
            stats.workerBreakdown.map((wb) => {
              const isOpen = expandedWorker === wb.worker.id;
              const pendingCount = wb.entries.filter((e) => (e.approvalStatus || "pending") === "pending").length;
              // Group by project
              const byProject = new Map<string, { name: string; hours: number }>();
              wb.entries.forEach((e) => {
                const key = e.projectId || "none";
                const name = e.project?.name || "No project";
                if (!byProject.has(key)) byProject.set(key, { name, hours: 0 });
                byProject.get(key)!.hours += e.hours || 0;
              });

              return (
                <div key={wb.worker.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedWorker(isOpen ? null : wb.worker.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                        {wb.worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-slate-900">{wb.worker.name}</div>
                        <div className="text-[10px] text-slate-500">{wb.worker.role || wb.worker.position || "Worker"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">{wb.totalHours.toFixed(1)}h</div>
                        <div className="text-[10px] text-slate-500">{wb.daysWorked} days</div>
                      </div>
                      {pendingCount > 0 && (
                        <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          {pendingCount} pending
                        </span>
                      )}
                      {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-200 px-4 py-3 space-y-3">
                      {/* Project Breakdown */}
                      <div>
                        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">Hours by Project</div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(byProject.entries()).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg">
                              <span className="text-xs text-slate-700">{val.name}</span>
                              <span className="text-xs font-bold text-slate-900">{val.hours.toFixed(1)}h</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Entry List */}
                      <div>
                        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">Entries</div>
                        <div className="space-y-1">
                          {wb.entries.sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
                            <div key={e.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                              e.approvalStatus === "flagged" ? "bg-red-50" : e.approvalStatus === "approved" ? "bg-emerald-50/50" : "bg-slate-50"
                            }`}>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-700 font-medium w-24">{formatDateLabel(e.date)}</span>
                                <span className="text-slate-500">{formatTime(e.clockIn)} — {formatTime(e.clockOut)}</span>
                                <span className="text-slate-400">{e.project?.name || "—"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700">{(e.hours || 0).toFixed(1)}h</span>
                                <StatusBadge status={e.approvalStatus || "pending"} />
                                <button onClick={() => openEditModal(e)} className="p-0.5 text-indigo-600 hover:bg-indigo-100 rounded" title="Edit times">
                                  <Pencil size={12} />
                                </button>
                                {(e.approvalStatus || "pending") === "pending" && e.clockOut && (
                                  <button onClick={() => updateEntryStatus(e.id, "approved")} className="p-0.5 text-emerald-600 hover:bg-emerald-100 rounded" title="Approve">
                                    <Check size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Bulk Add Timesheets Modal ─── */}
      {showBulkAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowBulkAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Add Timesheets</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Add multiple time entries at once for training, missed clock-ins, etc.</p>
              </div>
              <button onClick={() => setShowBulkAdd(false)} className="text-slate-400 hover:text-slate-600">
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Column headers */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_120px_100px_100px_1fr_32px] gap-2 mb-2">
                <span className="text-[10px] font-medium text-slate-500 uppercase">Worker *</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase">Date *</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase">Clock In *</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase">Clock Out *</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase">Notes</span>
                <span></span>
              </div>
              <div className="space-y-2">
                {bulkRows.map((row, idx) => (
                  <div key={idx} className="sm:grid sm:grid-cols-[1fr_120px_100px_100px_1fr_32px] gap-2 items-start bg-slate-50 rounded-lg p-2 sm:p-0 sm:bg-transparent space-y-2 sm:space-y-0">
                    <select
                      value={row.workerId}
                      onChange={(e) => updateBulkRow(idx, "workerId", e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select worker...</option>
                      {workers.sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateBulkRow(idx, "date", e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="time"
                      value={row.clockIn}
                      onChange={(e) => updateBulkRow(idx, "clockIn", e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="time"
                      value={row.clockOut}
                      onChange={(e) => updateBulkRow(idx, "clockOut", e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateBulkRow(idx, "notes", e.target.value)}
                      placeholder="e.g. Training"
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => removeBulkRow(idx)}
                      disabled={bulkRows.length <= 1}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed self-center"
                      title="Remove row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addBulkRow}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition"
              >
                <Plus size={13} /> Add Row
              </button>

              {/* Apply same date/time to all rows helper */}
              {bulkRows.length > 1 && bulkRows[0].date && (
                <button
                  onClick={() => {
                    const first = bulkRows[0];
                    setBulkRows((prev) => prev.map((r) => ({ ...r, date: first.date, clockIn: first.clockIn, clockOut: first.clockOut, notes: r.notes || first.notes })));
                  }}
                  className="mt-2 text-[11px] text-slate-500 hover:text-indigo-600 underline"
                >
                  Apply Row 1 date &amp; times to all rows
                </button>
              )}

              {/* Skip lunch deduction toggle */}
              <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={skipLunch}
                  onClick={() => setSkipLunch((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${skipLunch ? "bg-indigo-600" : "bg-slate-300"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${skipLunch ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                </button>
                <span className="text-xs text-slate-600">
                  Skip lunch deduction {skipLunch && <span className="text-slate-400">(full hours will be logged)</span>}
                </span>
              </label>

              {/* Status messages */}
              {bulkSuccess > 0 && (
                <div className="mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                  <CheckCircle2 size={14} className="inline mr-1.5" />
                  {bulkSuccess} timesheet{bulkSuccess !== 1 ? "s" : ""} added successfully!
                </div>
              )}
              {bulkErrors.length > 0 && (
                <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-1">
                  {bulkErrors.map((err, i) => (
                    <div key={i}><AlertTriangle size={12} className="inline mr-1" />{err}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <span className="text-[11px] text-slate-500">{bulkRows.length} row{bulkRows.length !== 1 ? "s" : ""} · {skipLunch ? "No lunch deduction" : "30-min lunch auto-deducted for 6+ hr shifts"}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowBulkAdd(false)} className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800">
                  Cancel
                </button>
                <button
                  onClick={submitBulkEntries}
                  disabled={bulkSaving || bulkRows.every((r) => !r.workerId)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {bulkSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {bulkSaving ? "Saving..." : `Add ${bulkRows.filter((r) => r.workerId && r.date).length} Timesheet${bulkRows.filter((r) => r.workerId && r.date).length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Time Entry Modal ─── */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingEntry(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Edit Time Entry</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {editingEntry.worker?.name || "Unknown"} — {formatDateLabel(editingEntry.date)}
                  {editingEntry.project?.name ? ` — ${editingEntry.project.name}` : ""}
                </p>
              </div>
              <button onClick={() => setEditingEntry(null)} className="text-slate-400 hover:text-slate-600">
                <XIcon size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Clock In</label>
                <input
                  type="datetime-local"
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Clock Out</label>
                <input
                  type="datetime-local"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {!editClockOut && (
                  <p className="text-[10px] text-amber-600 mt-1">Worker is still clocked in. Set a time to close this entry.</p>
                )}
              </div>
              {editClockIn && editClockOut && (
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-500">Calculated hours: </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {Math.max(0, Math.round((new Date(editClockOut).getTime() - new Date(editClockIn).getTime()) / 3600000 * 100) / 100).toFixed(2)}h
                  </span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <button onClick={() => setEditingEntry(null)} className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800">
                Cancel
              </button>
              <button
                onClick={saveEditedEntry}
                disabled={editSaving || !editClockIn}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Reusable Components ─── */

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colors[color] || colors.indigo}`}>
          <Icon size={14} />
        </div>
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded-full">
        <Check size={10} /> Approved
      </span>
    );
  }
  if (status === "flagged") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded-full">
        <Flag size={10} /> Flagged
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
      <Clock size={10} /> Pending
    </span>
  );
}
