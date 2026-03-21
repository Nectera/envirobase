"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, GripVertical, Save, CheckCircle, Loader2, RotateCcw } from "lucide-react";
import {
  DEFAULT_CONSULTATION_FIELDS,
  FORMULA_FIELDS,
  type ConsultationFieldDef,
  type FieldType,
} from "@/lib/consultationFieldConfig";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text Input",
  textarea: "Text Area",
  number: "Number",
  select: "Dropdown",
  checkbox: "Checkbox",
  checkboxGroup: "Checkbox Group",
};

export default function ConsultationFieldSettings() {
  const [fields, setFields] = useState<ConsultationFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Load config from settings API
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((settings) => {
        // Find the consultation field config key (it's prefixed with orgId)
        const configKey = Object.keys(settings).find((k) =>
          k.startsWith("consultationFieldConfig_")
        );
        if (configKey && settings[configKey]) {
          try {
            setFields(JSON.parse(settings[configKey]));
          } catch {
            setFields([...DEFAULT_CONSULTATION_FIELDS]);
          }
        } else {
          setFields([...DEFAULT_CONSULTATION_FIELDS]);
        }
      })
      .catch(() => {
        setFields([...DEFAULT_CONSULTATION_FIELDS]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      // We need to get the orgId-scoped key. Fetch settings to find it, or use a dedicated endpoint.
      // The settings PUT accepts arbitrary keys — we need to fetch orgId first.
      const profileRes = await fetch("/api/auth/session");
      const session = await profileRes.json();
      const orgId = session?.user?.organizationId;
      if (!orgId) {
        alert("Could not determine organization. Please try again.");
        return;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [`consultationFieldConfig_${orgId}`]: JSON.stringify(fields),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Failed to save consultation field configuration.");
    } finally {
      setSaving(false);
    }
  }, [fields]);

  const addField = useCallback(() => {
    const id = `custom_${Date.now()}`;
    setFields((prev) => [
      ...prev,
      {
        id,
        label: "New Field",
        type: "text" as FieldType,
        group: "",
      },
    ]);
    setEditingField(id);
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setEditingField(null);
  }, []);

  const updateField = useCallback(
    (id: string, updates: Partial<ConsultationFieldDef>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const resetToDefaults = useCallback(() => {
    if (confirm("Reset all fields to the default configuration? This will remove any custom fields you've added.")) {
      setFields([...DEFAULT_CONSULTATION_FIELDS]);
    }
  }, []);

  // Simple drag-to-reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setFields((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIdx, 1);
      copy.splice(idx, 0, moved);
      return copy;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Consultation Estimate — Step 2 Fields
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Customize the fields shown on Step 2 (Field Consultation) of the consultation estimate form.
          Add, remove, rename, or reorder fields to match your workflow.
          Cost calculation fields (Days Needed, Crew Size, etc.) are always present and cannot be removed.
        </p>
      </div>

      {/* Field list */}
      <div className="space-y-2">
        {fields.map((field, idx) => {
          const isEditing = editingField === field.id;
          const isFormulaField = FORMULA_FIELDS.includes(field.id);

          return (
            <div
              key={field.id}
              draggable={!isFormulaField}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`border rounded-lg p-3 bg-white transition ${
                dragIdx === idx ? "border-blue-400 bg-blue-50" : "border-slate-200"
              } ${isFormulaField ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                {!isFormulaField && (
                  <GripVertical
                    size={16}
                    className="text-slate-400 cursor-grab flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {field.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      {FIELD_TYPE_LABELS[field.type] || field.type}
                    </span>
                    {field.group && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                        {field.group}
                      </span>
                    )}
                  </div>
                </div>
                {!isFormulaField && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingField(isEditing ? null : field.id)}
                      className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50"
                    >
                      {isEditing ? "Done" : "Edit"}
                    </button>
                    <button
                      onClick={() => removeField(field.id)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Editing panel */}
              {isEditing && !isFormulaField && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Label
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          updateField(field.id, { label: e.target.value })
                        }
                        className="w-full px-2 py-1.5 text-sm border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Type
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateField(field.id, {
                            type: e.target.value as FieldType,
                          })
                        }
                        className="w-full px-2 py-1.5 text-sm border rounded"
                      >
                        {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Group (optional)
                      </label>
                      <input
                        type="text"
                        value={field.group || ""}
                        onChange={(e) =>
                          updateField(field.id, { group: e.target.value })
                        }
                        placeholder="e.g. Site Conditions"
                        className="w-full px-2 py-1.5 text-sm border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Placeholder (optional)
                      </label>
                      <input
                        type="text"
                        value={field.placeholder || ""}
                        onChange={(e) =>
                          updateField(field.id, { placeholder: e.target.value })
                        }
                        className="w-full px-2 py-1.5 text-sm border rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!field.fullWidth}
                        onChange={(e) =>
                          updateField(field.id, { fullWidth: e.target.checked })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-slate-600">Full width</span>
                    </label>
                  </div>

                  {/* Options editor for select / checkboxGroup */}
                  {(field.type === "select" || field.type === "checkboxGroup") && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Options (one per line)
                      </label>
                      <textarea
                        value={(field.options || []).join("\n")}
                        onChange={(e) =>
                          updateField(field.id, {
                            options: e.target.value
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        rows={4}
                        className="w-full px-2 py-1.5 text-sm border rounded font-mono"
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={addField}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
        >
          <Plus size={14} /> Add Field
        </button>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <RotateCcw size={14} /> Reset to Defaults
        </button>
        <div className="flex-1" />
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle size={14} /> Saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Save Configuration
        </button>
      </div>
    </div>
  );
}
