"use client";

import { useState } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import { X, CalendarDays } from "lucide-react";

interface EventModalProps {
  editing: any | null;
  prefilledDate: string | null;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const EVENT_TYPES = [
  { value: "holiday", color: "#EF4444" },
  { value: "training", color: "#06B6D4" },
  { value: "meeting", color: "#A855F7" },
  { value: "inspection", color: "#F97316" },
  { value: "company_event", color: "#7BC143" },
  { value: "other", color: "#6B7280" },
] as const;

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#7BC143", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1", "#A855F7", "#EC4899",
];

export default function EventModal({ editing, prefilledDate, onSubmit, onClose }: EventModalProps) {
  const { t } = useTranslation();
  const todayStr = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    title: editing?.title || "",
    type: editing?.type || "company_event",
    description: editing?.description || "",
    startDate: editing?.startDate || prefilledDate || todayStr,
    endDate: editing?.endDate || prefilledDate || todayStr,
    allDay: editing?.allDay !== false,
    startTime: editing?.startTime || "",
    endTime: editing?.endTime || "",
    office: editing?.office || "",
    color: editing?.color || "#7BC143",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleTypeChange = (type: string) => {
    const preset = EVENT_TYPES.find((et) => et.value === type);
    setForm({ ...form, type, color: preset?.color || form.color });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startDate) return;
    setSubmitting(true);
    await onSubmit({
      ...form,
      office: form.office || null,
      startTime: form.allDay ? null : (form.startTime || null),
      endTime: form.allDay ? null : (form.endTime || null),
    });
    setSubmitting(false);
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";
  const labelClass = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-emerald-50 sticky top-0">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {editing ? t("calendar.events.edit") : t("calendar.events.create")}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
              placeholder="Event title..."
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className={labelClass}>Type</label>
            <select
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className={inputClass}
            >
              {EVENT_TYPES.map((et) => {
                const labelKey = et.value === "company_event" ? "companyEvent" : et.value;
                return <option key={et.value} value={et.value}>{t(`calendar.events.${labelKey}`)}</option>;
              })}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
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

          {/* All Day toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-600">{t("calendar.events.allDay")}</span>
            </label>
          </div>

          {/* Times (if not all day) */}
          {!form.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Time</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>End Time</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Office */}
          <div>
            <label className={labelClass}>{t("calendar.events.office")}</label>
            <select
              value={form.office}
              onChange={(e) => setForm({ ...form, office: e.target.value })}
              className={inputClass}
            >
              <option value="">{t("calendar.events.companyWide")}</option>
              <option value="greeley">Greeley</option>
              <option value="grand_junction">Grand Junction</option>
            </select>
          </div>

          {/* Color picker */}
          <div>
            <label className={labelClass}>Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    form.color === c ? "border-slate-800 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              rows={3}
              placeholder="Optional description..."
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
              disabled={submitting || !form.title}
              className="px-4 py-2 text-sm font-medium text-white rounded-xl hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: form.color }}
            >
              {submitting ? "Saving..." : editing ? "Update Event" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
