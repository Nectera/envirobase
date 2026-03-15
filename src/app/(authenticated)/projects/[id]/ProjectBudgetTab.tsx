"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Download,
  Pencil,
  X,
} from "lucide-react";

type BudgetLine = {
  id: string;
  category: string;
  description: string;
  budgetAmount: number;
  actualAmount: number;
  notes: string | null;
  source: string | null;
};

type BudgetData = {
  lines: BudgetLine[];
  totals: Record<string, { budget: number; actual: number }>;
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercent: number;
};

const CATEGORIES = [
  { value: "labor", label: "Labor" },
  { value: "materials", label: "Materials" },
  { value: "equipment", label: "Equipment" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "disposal", label: "Disposal" },
  { value: "permits", label: "Permits" },
  { value: "clearance", label: "Clearance" },
  { value: "other", label: "Other" },
];

const CAT_COLORS: Record<string, string> = {
  labor: "bg-indigo-100 text-indigo-700",
  materials: "bg-amber-100 text-amber-700",
  equipment: "bg-emerald-100 text-emerald-700",
  subcontractor: "bg-purple-100 text-purple-700",
  disposal: "bg-red-100 text-red-700",
  permits: "bg-blue-100 text-blue-700",
  clearance: "bg-pink-100 text-pink-700",
  other: "bg-slate-100 text-slate-700",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ProjectBudgetTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form
  const [addCategory, setAddCategory] = useState("labor");
  const [addDescription, setAddDescription] = useState("");
  const [addBudget, setAddBudget] = useState("");
  const [addActual, setAddActual] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editDescription, setEditDescription] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editActual, setEditActual] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fetchBudget = () => {
    fetch(`/api/project-budget?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBudget(); }, [projectId]);

  const handleAdd = async () => {
    if (!addDescription.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/project-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          category: addCategory,
          description: addDescription.trim(),
          budgetAmount: addBudget,
          actualAmount: addActual,
          notes: addNotes,
        }),
      });
      if (res.ok) {
        setShowAdd(false);
        setAddDescription("");
        setAddBudget("");
        setAddActual("");
        setAddNotes("");
        fetchBudget();
      }
    } catch {}
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/project-budget/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDescription,
          budgetAmount: editBudget,
          actualAmount: editActual,
          notes: editNotes,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchBudget();
      }
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this budget line?")) return;
    try {
      await fetch(`/api/project-budget/${id}`, { method: "DELETE" });
      fetchBudget();
    } catch {}
  };

  const startEdit = (line: BudgetLine) => {
    setEditingId(line.id);
    setEditDescription(line.description);
    setEditBudget(String(line.budgetAmount));
    setEditActual(String(line.actualAmount));
    setEditNotes(line.notes || "");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  const lines = data?.lines || [];
  const totalBudget = data?.totalBudget || 0;
  const totalActual = data?.totalActual || 0;
  const variance = data?.variance || 0;
  const pctUsed = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Budget Overview</h3>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            <Plus size={12} /> Add Line
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-slate-500">Budget</p>
            <p className="text-lg font-bold text-slate-900">{fmt(totalBudget)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Actual</p>
            <p className="text-lg font-bold text-slate-900">{fmt(totalActual)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Variance</p>
            <p className={`text-lg font-bold ${variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {fmt(Math.abs(variance))} {variance >= 0 ? "under" : "over"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {totalBudget > 0 && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>{Math.round(pctUsed)}% spent</span>
              <span>{fmt(totalBudget - totalActual)} remaining</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pctUsed > 100 ? "bg-red-400" : pctUsed > 80 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(pctUsed, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {data?.totals && Object.keys(data.totals).length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">By Category</h3>
          <div className="space-y-2">
            {Object.entries(data.totals)
              .sort(([, a], [, b]) => b.budget - a.budget)
              .map(([cat, totals]) => {
                const catVar = totals.budget - totals.actual;
                const catPct = totals.budget > 0 ? (totals.actual / totals.budget) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${CAT_COLORS[cat] || "bg-slate-100 text-slate-700"}`}>
                      {CATEGORIES.find((c) => c.value === cat)?.label || cat}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${catPct > 100 ? "bg-red-400" : "bg-indigo-400"}`}
                        style={{ width: `${Math.min(catPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-600 w-32 text-right">
                      {fmt(totals.actual)} / {fmt(totals.budget)}
                    </span>
                    <span className={`text-xs w-20 text-right font-medium ${catVar >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {catVar >= 0 ? "+" : ""}{fmt(catVar)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-lg border border-indigo-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Add Budget Line</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Category</label>
              <select
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Description</label>
              <input
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="e.g., Technician labor"
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Budget Amount</label>
              <input
                type="number"
                value={addBudget}
                onChange={(e) => setAddBudget(e.target.value)}
                placeholder="0"
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Actual Amount</label>
              <input
                type="number"
                value={addActual}
                onChange={(e) => setAddActual(e.target.value)}
                placeholder="0"
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Notes (optional)</label>
            <input
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !addDescription.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      )}

      {/* Line items table */}
      {lines.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-slate-600 font-semibold">Category</th>
                <th className="text-left px-4 py-2.5 text-slate-600 font-semibold">Description</th>
                <th className="text-right px-4 py-2.5 text-slate-600 font-semibold">Budget</th>
                <th className="text-right px-4 py-2.5 text-slate-600 font-semibold">Actual</th>
                <th className="text-right px-4 py-2.5 text-slate-600 font-semibold">Variance</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const lineVar = line.budgetAmount - line.actualAmount;
                if (editingId === line.id) {
                  return (
                    <tr key={line.id} className="border-b border-slate-100 bg-indigo-50/30">
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CAT_COLORS[line.category]}`}>
                          {CATEGORIES.find((c) => c.value === line.category)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={editBudget}
                          onChange={(e) => setEditBudget(e.target.value)}
                          className="w-24 border border-slate-300 rounded px-2 py-1 text-xs text-right"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={editActual}
                          onChange={(e) => setEditActual(e.target.value)}
                          className="w-24 border border-slate-300 rounded px-2 py-1 text-xs text-right"
                        />
                      </td>
                      <td />
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleUpdate(line.id)}
                            disabled={saving}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <Save size={12} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                            <X size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CAT_COLORS[line.category]}`}>
                        {CATEGORIES.find((c) => c.value === line.category)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {line.description}
                      {line.source === "estimate" && (
                        <span className="ml-1.5 text-[9px] text-blue-500 bg-blue-50 px-1 py-0.5 rounded">auto</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700 font-medium">{fmt(line.budgetAmount)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700 font-medium">{fmt(line.actualAmount)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${lineVar >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {lineVar >= 0 ? "+" : ""}{fmt(lineVar)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(line)} className="text-slate-400 hover:text-indigo-600">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDelete(line.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-2.5" colSpan={2}>Total</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{fmt(totalBudget)}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{fmt(totalActual)}</td>
                <td className={`px-4 py-2.5 text-right ${variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {variance >= 0 ? "+" : ""}{fmt(variance)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {lines.length === 0 && !showAdd && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <DollarSign size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-1">No budget lines yet</p>
          <p className="text-xs text-slate-400 mb-4">
            Add budget lines manually or populate from an estimate.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            <Plus size={12} /> Add Budget Line
          </button>
        </div>
      )}
    </div>
  );
}
