"use client";

import { useState, useEffect } from "react";
import { Bell, Calendar, CheckSquare, Shield, FileText, Loader2, Save, ArrowLeft, Package } from "lucide-react";
import Link from "next/link";

interface NotificationPreferences {
  scheduleAssigned: boolean;
  scheduleChanged: boolean;
  taskAssigned: boolean;
  taskDueSoon: boolean;
  taskCompleted: boolean;
  certExpiring: boolean;
  incidentReported: boolean;
  fieldReportSubmitted: boolean;
  inventoryReviewCompleted: boolean;
}

const defaultPrefs: NotificationPreferences = {
  scheduleAssigned: true,
  scheduleChanged: true,
  taskAssigned: true,
  taskDueSoon: true,
  taskCompleted: false,
  certExpiring: true,
  incidentReported: true,
  fieldReportSubmitted: true,
  inventoryReviewCompleted: true,
};

interface ToggleItem {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}

const sections: Array<{
  title: string;
  icon: any;
  iconColor: string;
  items: ToggleItem[];
}> = [
  {
    title: "Schedule",
    icon: Calendar,
    iconColor: "text-blue-500",
    items: [
      { key: "scheduleAssigned", label: "Schedule Assignment", description: "Notify me when I'm assigned to a project schedule" },
      { key: "scheduleChanged", label: "Schedule Changes", description: "Notify me when my schedule is modified" },
    ],
  },
  {
    title: "Tasks",
    icon: CheckSquare,
    iconColor: "text-green-500",
    items: [
      { key: "taskAssigned", label: "Task Assigned", description: "Notify me when a task is assigned to me" },
      { key: "taskDueSoon", label: "Task Due Soon", description: "Remind me when a task is approaching its due date" },
      { key: "taskCompleted", label: "Task Completed", description: "Notify me when tasks I created are completed" },
    ],
  },
  {
    title: "Safety & Compliance",
    icon: Shield,
    iconColor: "text-amber-500",
    items: [
      { key: "certExpiring", label: "Certification Expiry", description: "Notify me about expiring or expired certifications" },
      { key: "incidentReported", label: "Incident Reports", description: "Notify me when an incident is reported on a project" },
    ],
  },
  {
    title: "Daily Reports",
    icon: FileText,
    iconColor: "text-purple-500",
    items: [
      { key: "fieldReportSubmitted", label: "Field Report Submitted", description: "Notify me when a daily field report is submitted" },
    ],
  },
  {
    title: "Content Inventory",
    icon: Package,
    iconColor: "text-orange-500",
    items: [
      { key: "inventoryReviewCompleted", label: "Inventory Review Completed", description: "Notify me when a customer completes their content inventory review" },
    ],
  },
];

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setPrefs({
            scheduleAssigned: data.scheduleAssigned ?? true,
            scheduleChanged: data.scheduleChanged ?? true,
            taskAssigned: data.taskAssigned ?? true,
            taskDueSoon: data.taskDueSoon ?? true,
            taskCompleted: data.taskCompleted ?? false,
            certExpiring: data.certExpiring ?? true,
            incidentReported: data.incidentReported ?? true,
            fieldReportSubmitted: data.fieldReportSubmitted ?? true,
            inventoryReviewCompleted: data.inventoryReviewCompleted ?? true,
          });
        }
      })
      .catch(() => setError("Failed to load preferences"))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/settings"
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Bell size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Notification Settings</h1>
            <p className="text-sm text-slate-500">Choose which email notifications you receive</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2.5">
                <Icon size={16} className={section.iconColor} />
                <h2 className="text-sm font-semibold text-slate-700">{section.title}</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {section.items.map((item) => (
                  <div
                    key={item.key}
                    className="px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs[item.key]}
                      onClick={() => handleToggle(item.key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        prefs[item.key] ? "bg-green-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          prefs[item.key] ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="mt-6 flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-green-600 font-medium">Preferences saved!</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Preferences
        </button>
      </div>
    </div>
  );
}
