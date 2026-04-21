"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Pencil, Save, Loader2, FileText } from "lucide-react";

interface TermsTemplate {
  id: string;
  name: string;
  terms: string[];
  createdAt: string;
}

const DEFAULT_TERMS = [
  "This estimate is valid for 30 days from the date listed above.",
  "Final pricing may vary if site conditions differ from those observed during consultation.",
  "All work performed in compliance with applicable federal, state, and local regulations.",
  "Payment terms will be established upon acceptance of this estimate.",
];

export default function TermsTemplatesManager({ onClose, inline }: { onClose: () => void; inline?: boolean }) {
  const [templates, setTemplates] = useState<TermsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTerms, setEditTerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTerms, setNewTerms] = useState<string[]>([...DEFAULT_TERMS]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/terms-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const startEdit = (t: TermsTemplate) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditTerms([...t.terms]);
    setShowNew(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditTerms([]);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/terms-templates/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, terms: editTerms.filter((t) => t.trim()) }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        cancelEdit();
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const createTemplate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/terms-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, terms: newTerms.filter((t) => t.trim()) }),
      });
      if (res.ok) {
        const created = await res.json();
        setTemplates((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setShowNew(false);
        setNewName("");
        setNewTerms([...DEFAULT_TERMS]);
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/terms-templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        if (editingId === id) cancelEdit();
      }
    } catch {}
  };

  const updateEditTerm = (idx: number, val: string) => {
    setEditTerms((prev) => prev.map((t, i) => (i === idx ? val : t)));
  };
  const addEditTerm = () => setEditTerms((prev) => [...prev, ""]);
  const removeEditTerm = (idx: number) => {
    if (editTerms.length <= 1) return;
    setEditTerms((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateNewTerm = (idx: number, val: string) => {
    setNewTerms((prev) => prev.map((t, i) => (i === idx ? val : t)));
  };
  const addNewTerm = () => setNewTerms((prev) => [...prev, ""]);
  const removeNewTerm = (idx: number) => {
    if (newTerms.length <= 1) return;
    setNewTerms((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Terms & Conditions Templates</h2>
          <p className="text-xs text-slate-500 mt-0.5">Create reusable templates for different service types</p>
        </div>
        <button
          onClick={() => { setShowNew(true); cancelEdit(); }}
          disabled={showNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          <Plus size={13} /> New Template
        </button>
      </div>

      {/* Body */}
      <div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 size={20} className="animate-spin mr-2" /> Loading templates...
            </div>
          ) : (
            <>
              {templates.length === 0 && !showNew && (
                <div className="text-center py-10">
                  <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500 mb-1">No templates yet</p>
                  <p className="text-xs text-slate-400">Create templates for different services like Asbestos, Lead, Meth, etc.</p>
                </div>
              )}

              <div className="space-y-3">
                {templates.map((t) => (
                  <div key={t.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    {editingId === t.id ? (
                      <div className="p-4 bg-indigo-50/50">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Template name (e.g. Asbestos Abatement)"
                        />
                        <div className="space-y-2">
                          {editTerms.map((term, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-slate-400 text-xs mt-2.5 w-4 text-right select-none">{idx + 1}.</span>
                              <textarea
                                value={term}
                                onChange={(e) => updateEditTerm(idx, e.target.value)}
                                rows={2}
                                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                              />
                              <button onClick={() => removeEditTerm(idx)} disabled={editTerms.length <= 1} className="p-1 mt-1 text-slate-300 hover:text-red-500 rounded disabled:opacity-30">
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button onClick={addEditTerm} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-2">
                          + Add term
                        </button>
                        <div className="flex justify-end gap-2 mt-3">
                          <button onClick={cancelEdit} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800">Cancel</button>
                          <button onClick={saveEdit} disabled={saving || !editName.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-slate-800">{t.name}</h3>
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEdit(t)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => deleteTemplate(t.id, t.name)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <ul className="space-y-1">
                          {(t.terms as string[]).map((term, idx) => (
                            <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                              <span className="text-indigo-400 mt-0.5 select-none">•</span>
                              <span>{term}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {showNew && (
                <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50/30 mt-3">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">New Template</h3>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Template name (e.g. Asbestos Abatement)"
                    autoFocus
                  />
                  <div className="space-y-2">
                    {newTerms.map((term, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-400 text-xs mt-2.5 w-4 text-right select-none">{idx + 1}.</span>
                        <textarea
                          value={term}
                          onChange={(e) => updateNewTerm(idx, e.target.value)}
                          rows={2}
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                        <button onClick={() => removeNewTerm(idx)} disabled={newTerms.length <= 1} className="p-1 mt-1 text-slate-300 hover:text-red-500 rounded disabled:opacity-30">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addNewTerm} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-2">
                    + Add term
                  </button>
                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => { setShowNew(false); setNewName(""); setNewTerms([...DEFAULT_TERMS]); }} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800">
                      Cancel
                    </button>
                    <button onClick={createTemplate} disabled={saving || !newName.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Create Template
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
      </div>

      {/* Footer */}
      <div className="mt-3 text-[11px] text-slate-400">
        {templates.length} template{templates.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
