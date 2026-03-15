"use client";

import { useState, useEffect } from "react";
import { X, Save, Trash2, Loader2, AlertTriangle, MapPin, Shield, ShieldX } from "lucide-react";

type Cert = { id: string; name: string; expires: string | null; status: string };
type Worker = { id: string; name: string; role: string; city: string | null; state: string | null; types: string[]; certifications?: Cert[] };
type Project = { id: string; name: string; type: string; status: string; projectNumber?: string; address: string };
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

const TYPE_LABEL: Record<string, string> = {
  ASBESTOS: "Asbestos",
  LEAD: "Lead",
  METH: "Meth Lab",
  MOLD: "Mold",
  SELECT_DEMO: "Select Demo",
  REBUILD: "Rebuild",
  SELECT_DEMO_REBUILD: "Select Demo & Rebuild",
};

export default function ScheduleModal({
  entry,
  prefillDate,
  projects,
  workers,
  existingEntries,
  onSave,
  onDelete,
  onClose,
}: {
  entry: Entry | null;
  prefillDate: string | null;
  projects: Project[];
  workers: Worker[];
  existingEntries: Entry[];
  onSave: (data: any) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [workerId, setWorkerId] = useState(entry?.workerId || "");
  const [projectId, setProjectId] = useState(entry?.projectId || "");
  const [date, setDate] = useState(entry?.date || prefillDate || new Date().toISOString().split("T")[0]);
  const [shift, setShift] = useState(entry?.shift || "full");
  const [hours, setHours] = useState(String(entry?.hours || 8));
  const [notes, setNotes] = useState(entry?.notes || "");
  const [saving, setSaving] = useState(false);

  const selectedWorker = workers.find((w) => w.id === workerId);
  const selectedProject = projects.find((p) => p.id === projectId);

  // Compatibility check (multi-type support)
  const workerTypes = selectedWorker
    ? (Array.isArray(selectedWorker.types) ? selectedWorker.types : []).map((t: string) => t.toUpperCase())
    : [];
  const projectTypes = (selectedProject?.type || "").split(",").map((t: string) => t.trim().toUpperCase()).filter(Boolean);
  const missingTypes = projectTypes.filter((pt: string) => !workerTypes.includes(pt));
  const mismatch = selectedWorker && selectedProject && projectTypes.length > 0 && missingTypes.length > 0;

  // Hard cert requirement block
  const [certBlock, setCertBlock] = useState<{ allowed: boolean; missing: string[]; expired: string[] } | null>(null);
  const [certChecking, setCertChecking] = useState(false);

  useEffect(() => {
    if (!workerId || !selectedProject || projectTypes.length === 0) {
      setCertBlock(null);
      return;
    }
    let cancelled = false;
    setCertChecking(true);
    fetch("/api/cert-requirements/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId, projectTypes }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setCertBlock(data.error ? null : data);
          setCertChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setCertBlock(null); setCertChecking(false); }
      });
    return () => { cancelled = true; };
  }, [workerId, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const certBlocked = certBlock && !certBlock.allowed;

  // Double-booking check
  const conflict = workerId && date && shift && existingEntries.some(
    (e) =>
      e.workerId === workerId &&
      e.date === date &&
      e.shift === shift &&
      e.id !== entry?.id
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workerId || !projectId || !date) return;
    setSaving(true);
    await onSave({
      workerId,
      projectId,
      date,
      shift,
      hours: parseFloat(hours) || 8,
      notes: notes || null,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">
            {entry ? "Edit Assignment" : "New Assignment"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          {/* Worker */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Worker</label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select worker...</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}{w.city || w.state ? ` – ${[w.city, w.state].filter(Boolean).join(", ")}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Worker Info */}
          {selectedWorker && (
            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs space-y-1">
              {(selectedWorker.city || selectedWorker.state) && (
                <div className="flex items-center gap-1 text-slate-500">
                  <MapPin size={10} /> {[selectedWorker.city, selectedWorker.state].filter(Boolean).join(", ")}
                </div>
              )}
              {selectedWorker.certifications && selectedWorker.certifications.length > 0 && (
                <div className="flex items-start gap-1">
                  <Shield size={10} className="text-slate-400 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {selectedWorker.certifications.map((c) => {
                      const days = c.expires ? Math.ceil((new Date(c.expires).getTime() - Date.now()) / 86400000) : 999;
                      const color = days < 0 ? "bg-red-100 text-red-700" : days <= 30 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
                      return (
                        <span key={c.id} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
                          {c.name}{days < 0 ? " (expired)" : days <= 30 ? ` (${days}d)` : ""}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Project */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({TYPE_LABEL[p.type?.toUpperCase()] || p.type})
                </option>
              ))}
            </select>
          </div>

          {/* Warnings */}
          {mismatch && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>
                {selectedWorker?.name} is missing {missingTypes.join(", ").toLowerCase()} certification{missingTypes.length > 1 ? "s" : ""}. Their types:{" "}
                {workerTypes.join(", ") || "none"}.
              </span>
            </div>
          )}

          {certBlocked && (
            <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <ShieldX size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Blocked — missing required certifications</span>
                {certBlock!.missing.length > 0 && (
                  <div className="mt-1">Missing: {certBlock!.missing.join(", ")}</div>
                )}
                {certBlock!.expired.length > 0 && (
                  <div className="mt-1">Expired: {certBlock!.expired.join(", ")}</div>
                )}
              </div>
            </div>
          )}

          {conflict && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>This worker already has an assignment for this date and shift.</span>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Shift + Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Shift</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="full">Full Day</option>
                <option value="morning">Morning (AM)</option>
                <option value="afternoon">Afternoon (PM)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hours</label>
              <input
                type="number"
                min="1"
                max="16"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                >
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !workerId || !projectId || !date || !!conflict || !!certBlocked || certChecking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {entry ? "Update" : "Assign"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
