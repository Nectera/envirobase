"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, LogIn, LogOut, Coffee, ChevronDown, User, AlertTriangle, FileDown, Users,
  MapPin, Navigation, Pencil, X, Trash2, Calendar,
} from "lucide-react";

type Project = { id: string; name: string; type: string };
type Worker = { id: string; name: string; role: string; userId?: string };
type TimeEntry = {
  id: string;
  projectId: string;
  workerId: string;
  workerName: string;
  role: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  totalHours: number | null;
  notes: string;
  project?: Project & { address?: string };
  clockInLat?: number | null;
  clockInLng?: number | null;
  clockInAddress?: string | null;
  clockOutLat?: number | null;
  clockOutLng?: number | null;
  clockOutAddress?: string | null;
};

/** Request browser geolocation — resolves with coords or null on deny/timeout */
function getGeoLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/** Haversine distance in miles between two lat/lng points */
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TimeClockPanel({
  projects,
  workers,
  todayEntries,
  weekEntries,
  activeEntries,
  currentWorker,
  currentUserRole,
  isAdmin,
}: {
  projects: Project[];
  workers: Worker[];
  todayEntries: TimeEntry[];
  weekEntries: TimeEntry[];
  activeEntries: TimeEntry[];
  currentWorker: Worker | null;
  currentUserRole: "supervisor" | "technician";
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Clock-in form state — auto-populate from logged-in user
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(currentWorker?.id || "");
  const [selectedRole, setSelectedRole] = useState<"supervisor" | "technician">(currentUserRole);
  const [clockingForOther, setClockingForOther] = useState(false);

  // Clock-out / break modals
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [entryNotes, setEntryNotes] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "fetching" | "granted" | "denied">("idle");

  // Time log view toggle
  const [timeLogView, setTimeLogView] = useState<"today" | "week">("today");

  // Edit modal state (admin only)
  const [editModalEntry, setEditModalEntry] = useState<TimeEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function openEditModal(entry: TimeEntry) {
    setEditModalEntry(entry);
    // Format ISO datetime to local datetime-local input value
    const toLocal = (iso: string) => {
      const d = new Date(iso);
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60000);
      return local.toISOString().slice(0, 16);
    };
    setEditClockIn(entry.clockIn ? toLocal(entry.clockIn) : "");
    setEditClockOut(entry.clockOut ? toLocal(entry.clockOut) : "");
    setEditProject(entry.projectId || "");
    setEditNotes(entry.notes || "");
  }

  async function handleEditSave() {
    if (!editModalEntry) return;
    setEditSaving(true);
    setError("");
    try {
      const payload: any = { notes: editNotes };

      // Send updated clockIn if changed
      if (editClockIn) {
        payload.clockIn = new Date(editClockIn).toISOString();
      }
      // Send updated clockOut if set
      if (editClockOut) {
        payload.clockOut = new Date(editClockOut).toISOString();
      }
      // Send updated project
      payload.projectId = editProject || null;

      const res = await fetch(`/api/time-clock/${editModalEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update entry");
        return;
      }
      setEditModalEntry(null);
      router.refresh();
    } catch {
      setError("Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    if (!confirm("Delete this time entry? This cannot be undone.")) return;
    setLoading(true);
    try {
      await fetch(`/api/time-clock/${entryId}`, { method: "DELETE" });
      setEditModalEntry(null);
      router.refresh();
    } catch {
      setError("Failed to delete entry");
    } finally {
      setLoading(false);
    }
  }

  const effectiveWorker = clockingForOther
    ? workers.find((w) => w.id === selectedWorker)
    : currentWorker;
  const effectiveWorkerId = effectiveWorker?.id || "";
  const effectiveWorkerName = effectiveWorker?.name || "Unknown";
  const isWorkerActive = activeEntries.some((e) => e.workerId === effectiveWorkerId);

  // Detect office admin role (no project needed for clock-in)
  const isOfficeRole = currentWorker?.role
    ? ["OFFICE", "ADMIN"].includes(currentWorker.role.toUpperCase()) ||
      currentWorker.role.toLowerCase().includes("office")
    : false;

  // My active entry (for quick self clock-out)
  const myActiveEntry = currentWorker
    ? activeEntries.find((e) => e.workerId === currentWorker.id)
    : null;

  async function handleClockIn() {
    // Office admin doesn't need a project for self clock-in
    if (!isOfficeRole && !clockingForOther && !selectedProject) return;
    if (clockingForOther && !selectedProject) return;
    if (!effectiveWorkerId) return;
    setLoading(true);
    setError("");

    const clockRole = isOfficeRole && !clockingForOther ? "office" : selectedRole;

    // Capture GPS location
    setGpsStatus("fetching");
    const loc = await getGeoLocation();
    setGpsStatus(loc ? "granted" : "denied");

    try {
      const res = await fetch("/api/time-clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject || null,
          workerId: effectiveWorkerId,
          workerName: effectiveWorkerName,
          role: clockRole,
          clockInLat: loc?.lat ?? null,
          clockInLng: loc?.lng ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to clock in");
        return;
      }

      setSelectedProject("");
      setGpsStatus("idle");
      if (clockingForOther) {
        setSelectedWorker("");
        setClockingForOther(false);
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleClockOut(entryId: string) {
    setLoading(true);

    // Capture GPS location on clock-out
    setGpsStatus("fetching");
    const loc = await getGeoLocation();
    setGpsStatus(loc ? "granted" : "denied");

    try {
      await fetch(`/api/time-clock/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clockOut: "now",
          breakMinutes,
          notes: entryNotes,
          clockOutLat: loc?.lat ?? null,
          clockOutLng: loc?.lng ?? null,
        }),
      });
      setEditingEntry(null);
      setBreakMinutes(0);
      setEntryNotes("");
      setGpsStatus("idle");
      router.refresh();
    } catch {
      setError("Failed to clock out");
    } finally {
      setLoading(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getElapsed(clockIn: string) {
    const diff = Date.now() - new Date(clockIn).getTime();
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  }

  /** Render the entries table (reused by both today and week views) */
  function renderEntryTable(entries: TimeEntry[]) {
    return (
      <table className="w-full text-sm">
        <thead className="bg-slate-50/50 border-b border-slate-100">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Worker</th>
            <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Role</th>
            <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Clock In</th>
            <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Clock Out</th>
            <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Break</th>
            <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Total</th>
            <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">GPS</th>
            <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Notes</th>
            {isAdmin && <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs w-10"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-medium text-slate-800">{entry.workerName}</td>
              <td className="px-4 py-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  entry.role === "office"
                    ? "bg-blue-100 text-blue-700"
                    : entry.role === "supervisor"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {entry.role === "office" ? "OFFICE" : entry.role === "supervisor" ? "SUP" : "TECH"}
                </span>
              </td>
              <td className="px-4 py-2 text-slate-600">{formatTime(entry.clockIn)}</td>
              <td className="px-4 py-2 text-slate-600">
                {entry.clockOut ? formatTime(entry.clockOut) : (
                  <span className="text-emerald-600 text-xs font-medium">Active</span>
                )}
              </td>
              <td className="px-4 py-2 text-slate-500">
                {entry.breakMinutes > 0 ? `${entry.breakMinutes}m` : "—"}
              </td>
              <td className="px-4 py-2 font-medium text-slate-800">
                {entry.totalHours != null ? `${entry.totalHours.toFixed(1)}h` : "—"}
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1">
                  {entry.clockInLat != null ? (
                    <a
                      href={`https://maps.google.com/?q=${entry.clockInLat},${entry.clockInLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded flex items-center gap-0.5 hover:bg-emerald-100 transition"
                      title={`Clock-in: ${entry.clockInLat?.toFixed(5)}, ${entry.clockInLng?.toFixed(5)}`}
                    >
                      <Navigation size={9} /> In
                    </a>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded">—</span>
                  )}
                  {entry.clockOutLat != null ? (
                    <a
                      href={`https://maps.google.com/?q=${entry.clockOutLat},${entry.clockOutLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded flex items-center gap-0.5 hover:bg-blue-100 transition"
                      title={`Clock-out: ${entry.clockOutLat?.toFixed(5)}, ${entry.clockOutLng?.toFixed(5)}`}
                    >
                      <Navigation size={9} /> Out
                    </a>
                  ) : entry.clockOut ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded">—</span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-2 text-slate-500 max-w-[200px] truncate">
                {entry.notes || "—"}
              </td>
              {isAdmin && (
                <td className="px-4 py-2">
                  <button
                    onClick={() => openEditModal(entry)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
                    title="Edit time entry"
                  >
                    <Pencil size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Group by project for daily summary (null projectId = "office")
  const projectGroups = new Map<string, TimeEntry[]>();
  for (const entry of todayEntries) {
    const key = entry.projectId || "__office__";
    if (!projectGroups.has(key)) projectGroups.set(key, []);
    projectGroups.get(key)!.push(entry);
  }

  return (
    <div className="space-y-6">

      {/* Quick Self Clock-In/Out */}
      {currentWorker && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <User size={16} className="text-indigo-500" />
                {currentWorker.name}
              </h2>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block ${
                isOfficeRole ? "bg-blue-100 text-blue-700" : currentUserRole === "supervisor" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
              }`}>
                {isOfficeRole ? "OFFICE" : currentUserRole === "supervisor" ? "SUPERVISOR" : "TECHNICIAN"}
              </span>
            </div>
            {myActiveEntry && (
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Clocked In
                </div>
                <div className="text-xs text-slate-500">
                  {myActiveEntry.project?.name || "Office"} · {getElapsed(myActiveEntry.clockIn)}
                </div>
              </div>
            )}
          </div>

          {myActiveEntry ? (
            /* Clock-out form for self */
            <div>
              {editingEntry === myActiveEntry.id ? (
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Break (min)</label>
                    <input
                      type="number"
                      min="0"
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                      className="w-24 border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
                    <input
                      type="text"
                      value={entryNotes}
                      onChange={(e) => setEntryNotes(e.target.value)}
                      placeholder="End-of-day notes (optional)"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => handleClockOut(myActiveEntry.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full flex items-center gap-2"
                  >
                    <LogOut size={16} /> Clock Out
                  </button>
                  <button
                    onClick={() => { setEditingEntry(null); setBreakMinutes(0); setEntryNotes(""); }}
                    className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingEntry(myActiveEntry.id); setBreakMinutes(myActiveEntry.breakMinutes); setEntryNotes(myActiveEntry.notes); }}
                  className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg border border-red-200 flex items-center justify-center gap-2 transition"
                >
                  <LogOut size={16} /> Clock Out
                </button>
              )}
            </div>
          ) : isOfficeRole ? (
            /* Simple clock-in for office admin — no project needed */
            <button
              onClick={handleClockIn}
              disabled={loading}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-full transition flex items-center justify-center gap-2"
            >
              <LogIn size={16} /> Clock In
            </button>
          ) : (
            /* Clock-in form for field workers — project required */
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
                >
                  <option value="">Select project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleClockIn}
                disabled={loading || !selectedProject}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-full transition flex items-center gap-2"
              >
                <LogIn size={16} /> Clock In
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin: Clock In Others */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              Clock In Team Member
            </h2>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {gpsStatus === "fetching" && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4">
              <MapPin size={14} className="animate-pulse" /> Capturing GPS location...
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Project</label>
              <select
                value={clockingForOther ? selectedProject : ""}
                onChange={(e) => { setClockingForOther(true); setSelectedProject(e.target.value); }}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
              >
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Worker</label>
              <select
                value={clockingForOther ? selectedWorker : ""}
                onChange={(e) => {
                  setClockingForOther(true);
                  setSelectedWorker(e.target.value);
                  const w = workers.find((w) => w.id === e.target.value);
                  if (w) {
                    const r = w.role.toLowerCase();
                    setSelectedRole(
                      r.includes("supervisor") || r.includes("owner") || r.includes("admin")
                        ? "supervisor"
                        : "technician"
                    );
                  }
                }}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
              >
                <option value="">Select worker…</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {activeEntries.some((e) => e.workerId === w.id) ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as "supervisor" | "technician")}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
              >
                <option value="technician">Technician</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => { setClockingForOther(true); handleClockIn(); }}
                disabled={loading || !(clockingForOther && selectedProject && selectedWorker) || (clockingForOther && activeEntries.some((e) => e.workerId === selectedWorker))}
                className="w-full px-4 py-2 bg-[#7BC143] hover:bg-[#6aad38] disabled:bg-slate-300 text-white text-sm font-medium rounded-full transition flex items-center justify-center gap-2"
              >
                <LogIn size={16} /> Clock In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Clock-Ins */}
      {activeEntries.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Clock size={16} className="text-emerald-500" />
              Active ({activeEntries.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {activeEntries.map((entry) => (
              <div key={entry.id} className="px-5 py-3 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900">{entry.workerName}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      entry.role === "office"
                        ? "bg-blue-100 text-blue-700"
                        : entry.role === "supervisor"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {entry.role === "office" ? "OFFICE" : entry.role === "supervisor" ? "SUPERVISOR" : "TECHNICIAN"}
                    </span>
                    {entry.clockInLat != null && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded flex items-center gap-0.5" title={`GPS: ${entry.clockInLat?.toFixed(4)}, ${entry.clockInLng?.toFixed(4)}`}>
                        <MapPin size={10} /> GPS
                      </span>
                    )}
                    {entry.clockInLat == null && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded flex items-center gap-0.5" title="No GPS captured at clock-in">
                        <MapPin size={10} /> No GPS
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {entry.project?.name || "Office"} · In at {formatTime(entry.clockIn)} · {getElapsed(entry.clockIn)} elapsed
                    {entry.clockInAddress && ` · ${entry.clockInAddress}`}
                  </div>
                </div>

                {/* Only admins can clock out others; everyone can clock out themselves */}
                {(isAdmin || entry.workerId === currentWorker?.id) && (
                  <>
                    {editingEntry === entry.id ? (
                      <div className="flex items-center gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 block">Break (min)</label>
                          <input
                            type="number"
                            min="0"
                            value={breakMinutes}
                            onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                            className="w-20 border border-slate-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">Notes</label>
                          <input
                            type="text"
                            value={entryNotes}
                            onChange={(e) => setEntryNotes(e.target.value)}
                            placeholder="Optional"
                            className="w-40 border border-slate-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <button
                          onClick={() => handleClockOut(entry.id)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-full"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => { setEditingEntry(null); setBreakMinutes(0); setEntryNotes(""); }}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingEntry(entry.id); setBreakMinutes(entry.breakMinutes); setEntryNotes(entry.notes); }}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-full border border-red-200 flex items-center gap-1.5"
                      >
                        <LogOut size={13} /> Clock Out
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Log — Today / This Week toggle */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <User size={16} className="text-slate-400" />
            Time Log
          </h2>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setTimeLogView("today")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                timeLogView === "today" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeLogView("week")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                timeLogView === "week" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              This Week
            </button>
          </div>
        </div>

        {timeLogView === "today" ? (
          /* ── Today View ── */
          todayEntries.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-lg border border-slate-200">
              <Clock size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No time entries for today yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(projectGroups.entries()).map(([projId, entries]) => {
                const proj = entries[0]?.project;
                const supervisorHrs = entries
                  .filter((e) => e.role === "supervisor" && e.totalHours)
                  .reduce((s, e) => s + (e.totalHours || 0), 0);
                const techHrs = entries
                  .filter((e) => e.role === "technician" && e.totalHours)
                  .reduce((s, e) => s + (e.totalHours || 0), 0);
                const openCount = entries.filter((e) => !e.clockOut).length;

                return (
                  <div key={projId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm text-slate-800">{projId === "__office__" ? "Office" : (proj?.name || "Unknown Project")}</span>
                        {openCount > 0 && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                            {openCount} active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex gap-4">
                        <span>Supervisor: <strong className="text-indigo-600">{supervisorHrs.toFixed(1)}h</strong></span>
                        <span>Tech: <strong className="text-slate-800">{techHrs.toFixed(1)}h</strong></span>
                        <span>Total: <strong className="text-slate-900">{(supervisorHrs + techHrs).toFixed(1)}h</strong></span>
                      </div>
                    </div>
                    {renderEntryTable(entries)}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── Week View ── */
          (() => {
            // Group week entries by date, then by project within each date
            const dateGroups = new Map<string, TimeEntry[]>();
            for (const entry of weekEntries) {
              const d = entry.date || "unknown";
              if (!dateGroups.has(d)) dateGroups.set(d, []);
              dateGroups.get(d)!.push(entry);
            }
            // Sort dates descending (most recent first)
            const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => b.localeCompare(a));

            if (weekEntries.length === 0) {
              return (
                <div className="text-center py-10 bg-white rounded-lg border border-slate-200">
                  <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No time entries this week yet.</p>
                </div>
              );
            }

            // Week totals
            const weekTotalHrs = weekEntries.reduce((s, e) => s + (e.totalHours || 0), 0);
            const weekSupHrs = weekEntries.filter((e) => e.role === "supervisor").reduce((s, e) => s + (e.totalHours || 0), 0);
            const weekTechHrs = weekEntries.filter((e) => e.role === "technician").reduce((s, e) => s + (e.totalHours || 0), 0);

            return (
              <div className="space-y-4">
                {/* Week summary bar */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-500" />
                    <span className="text-sm font-semibold text-indigo-800">Week Total</span>
                  </div>
                  <div className="text-xs text-indigo-700 flex gap-4">
                    <span>Supervisor: <strong>{weekSupHrs.toFixed(1)}h</strong></span>
                    <span>Tech: <strong>{weekTechHrs.toFixed(1)}h</strong></span>
                    <span>Total: <strong className="text-indigo-900">{weekTotalHrs.toFixed(1)}h</strong></span>
                    <span className="text-indigo-400">|</span>
                    <span>{weekEntries.length} entries</span>
                  </div>
                </div>

                {sortedDates.map((dateStr) => {
                  const dayEntries = dateGroups.get(dateStr) || [];
                  const isToday = dateStr === new Date().toISOString().split("T")[0];
                  const dayLabel = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  });
                  const dayTotalHrs = dayEntries.reduce((s, e) => s + (e.totalHours || 0), 0);

                  // Group this day's entries by project
                  const dayProjectGroups = new Map<string, TimeEntry[]>();
                  for (const entry of dayEntries) {
                    const key = entry.projectId || "__office__";
                    if (!dayProjectGroups.has(key)) dayProjectGroups.set(key, []);
                    dayProjectGroups.get(key)!.push(entry);
                  }

                  return (
                    <div key={dateStr}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xs font-semibold text-slate-600">
                          {dayLabel}
                          {isToday && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">Today</span>}
                        </h3>
                        <div className="flex-1 border-t border-slate-200" />
                        <span className="text-xs text-slate-500 font-medium">{dayTotalHrs.toFixed(1)}h</span>
                      </div>
                      <div className="space-y-3">
                        {Array.from(dayProjectGroups.entries()).map(([projId, entries]) => {
                          const proj = entries[0]?.project;
                          const supHrs = entries.filter((e) => e.role === "supervisor" && e.totalHours).reduce((s, e) => s + (e.totalHours || 0), 0);
                          const tHrs = entries.filter((e) => e.role === "technician" && e.totalHours).reduce((s, e) => s + (e.totalHours || 0), 0);
                          const openCount = entries.filter((e) => !e.clockOut).length;

                          return (
                            <div key={projId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div>
                                  <span className="font-semibold text-sm text-slate-800">{projId === "__office__" ? "Office" : (proj?.name || "Unknown Project")}</span>
                                  {openCount > 0 && (
                                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                                      {openCount} active
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 flex gap-4">
                                  <span>Supervisor: <strong className="text-indigo-600">{supHrs.toFixed(1)}h</strong></span>
                                  <span>Tech: <strong className="text-slate-800">{tHrs.toFixed(1)}h</strong></span>
                                  <span>Total: <strong className="text-slate-900">{(supHrs + tHrs).toFixed(1)}h</strong></span>
                                </div>
                              </div>
                              {renderEntryTable(entries)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>
      {/* Edit Time Entry Modal (Admin only) */}
      {editModalEntry && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-900">Edit Time Entry</h3>
              <button onClick={() => setEditModalEntry(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-500 mb-4">
              <span className="font-medium text-slate-700">{editModalEntry.workerName}</span>
              {" · "}
              <span className="uppercase">{editModalEntry.role}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Project</label>
                <select
                  value={editProject}
                  onChange={(e) => setEditProject(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
                >
                  <option value="">No project (Office)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Clock In</label>
                  <input
                    type="datetime-local"
                    value={editClockIn}
                    onChange={(e) => setEditClockIn(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Clock Out</label>
                  <input
                    type="datetime-local"
                    value={editClockOut}
                    onChange={(e) => setEditClockOut(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
                  />
                  {!editModalEntry.clockOut && !editClockOut && (
                    <span className="text-[10px] text-emerald-600 mt-1 block">Currently active — leave blank to keep open</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
                />
              </div>

              {/* GPS info (read-only) */}
              {(editModalEntry.clockInLat != null || editModalEntry.clockOutLat != null) && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">GPS Data</span>
                  <div className="flex gap-3 mt-1.5">
                    {editModalEntry.clockInLat != null && (
                      <a
                        href={`https://maps.google.com/?q=${editModalEntry.clockInLat},${editModalEntry.clockInLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <MapPin size={11} /> Clock-in location
                      </a>
                    )}
                    {editModalEntry.clockOutLat != null && (
                      <a
                        href={`https://maps.google.com/?q=${editModalEntry.clockOutLat},${editModalEntry.clockOutLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <MapPin size={11} /> Clock-out location
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => handleDeleteEntry(editModalEntry.id)}
                className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1.5 transition"
              >
                <Trash2 size={13} /> Delete Entry
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditModalEntry(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-full transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="px-5 py-2 bg-[#7BC143] hover:bg-[#6aad38] disabled:bg-slate-300 text-white text-sm font-medium rounded-full transition"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
