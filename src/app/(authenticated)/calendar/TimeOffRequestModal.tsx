"use client";

import { useState } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import { X, Palmtree } from "lucide-react";

interface TimeOffRequestModalProps {
  isAdmin: boolean;
  workers: any[];
  userId: string;
  editing: any | null;
  prefilledDate: string | null;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const TIME_OFF_TYPES = [
  "vacation", "sick", "personal", "jury_duty", "bereavement", "unpaid",
] as const;

export default function TimeOffRequestModal({
  isAdmin, workers, userId, editing, prefilledDate, onSubmit, onClose,
}: TimeOffRequestModalProps) {
  const { t } = useTranslation();
  const todayStr = new Date().toISOString().split("T")[0];

  // Find the worker linked to this user (for technician self-requests)
  const selfWorker = workers.find((w: any) => w.userId === userId);

  const [form, setForm] = useState({
    workerId: editing?.workerId || (isAdmin ? "" : (selfWorker?.id || "")),
    type: editing?.type || "vacation",
    startDate: editing?.startDate || prefilledDate || todayStr,
    endDate: editing?.endDate || prefilledDate || todayStr,
    reason: editing?.reason || "",
    notes: editing?.notes || "",
    status: editing?.status || (isAdmin ? "approved" : "pending"),
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.workerId || !form.startDate || !form.endDate) return;
    setSubmitting(true);
    await onSubmit({
      ...form,
      requestedBy: selfWorker?.id || null,
    });
    setSubmitting(false);
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-blue-50">
          <div className="flex items-center gap-2">
            <Palmtree size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {editing ? "Edit Time Off" : t("timeoff.request")}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Worker (admin can pick any worker) */}
          {isAdmin ? (
            <div>
              <label className={labelClass}>Employee</label>
              <select
                value={form.workerId}
                onChange={(e) => setForm({ ...form, workerId: e.target.value })}
                className={inputClass}
                required
              >
                <option value="">Select employee...</option>
                {workers
                  .filter((w: any) => w.status === "active")
                  .sort((a: any, b: any) => a.name.localeCompare(b.name))
                  .map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <label className={labelClass}>Employee</label>
              <div className="px-3 py-2 text-sm bg-slate-50 rounded-xl text-slate-700">
                {selfWorker?.name || "Your account"}
              </div>
            </div>
          )}

          {/* Type */}
          <div>
            <label className={labelClass}>{t("timeoff.type")}</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className={inputClass}
            >
              {TIME_OFF_TYPES.map((type) => {
                const key = type === "jury_duty" ? "juryDuty" : type;
                return <option key={type} value={type}>{t(`timeoff.${key}`)}</option>;
              })}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t("timeoff.startDate")}</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>{t("timeoff.endDate")}</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                min={form.startDate}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Status (admin only) */}
          {isAdmin && (
            <div>
              <label className={labelClass}>{t("timeoff.status")}</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputClass}
              >
                <option value="approved">{t("timeoff.approved")}</option>
                <option value="pending">{t("timeoff.pending")}</option>
                <option value="denied">{t("timeoff.denied")}</option>
              </select>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className={labelClass}>{t("timeoff.reason")}</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className={inputClass}
              rows={2}
              placeholder="Optional..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.workerId}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Saving..." : editing ? "Update" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
