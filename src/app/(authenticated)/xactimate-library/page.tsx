"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Search, Plus, Star, Trash2, Loader2, X, Edit2, Save, Download, Filter } from "lucide-react";

type XactItem = {
  id: string;
  code: string;
  category: string;
  description: string;
  unit: string;
  defaultRate: number | null;
  projectTypes: string[];
  notes: string | null;
  favorite: boolean;
};

const UNIT_OPTIONS = ["SF", "LF", "EA", "HR", "DA", "CF", "SQ", "TN", "CY", "GAL", "BF"];
const PROJECT_TYPE_OPTIONS = [
  { value: "ASBESTOS", label: "Asbestos" },
  { value: "METH", label: "Meth" },
  { value: "LEAD", label: "Lead" },
  { value: "MOLD", label: "Mold" },
  { value: "SELECT_DEMO", label: "Selective Demo" },
];

const CATEGORY_COLORS: Record<string, string> = {
  ACM: "bg-red-100 text-red-700",
  CON: "bg-indigo-100 text-indigo-700",
  DEM: "bg-orange-100 text-orange-700",
  CLN: "bg-cyan-100 text-cyan-700",
  TST: "bg-purple-100 text-purple-700",
  LBP: "bg-amber-100 text-amber-700",
  MTH: "bg-pink-100 text-pink-700",
  DSP: "bg-slate-100 text-slate-700",
  LBR: "bg-emerald-100 text-emerald-700",
  EQP: "bg-blue-100 text-blue-700",
};

export default function XactimateLibraryPage() {
  const { data: sessionData } = useSession();
  const userRole = (sessionData?.user as any)?.role;
  const canEdit = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

  const [items, setItems] = useState<XactItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterType, setFilterType] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Create/Edit
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formUnit, setFormUnit] = useState("SF");
  const [formRate, setFormRate] = useState("");
  const [formTypes, setFormTypes] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchItems() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCat) params.set("category", filterCat);
      if (filterType) params.set("projectType", filterType);
      if (favOnly) params.set("favorites", "true");
      if (search) params.set("search", search);
      const res = await fetch(`/api/xact-library?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        if (data.categories?.length) setCategories(data.categories);
      }
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { fetchItems(); }, [filterCat, filterType, favOnly]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchItems(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleSeed() {
    setSeeding(true);
    try {
      await fetch("/api/xact-library/seed", { method: "POST" });
      await fetchItems();
    } catch {}
    finally { setSeeding(false); }
  }

  function resetForm() {
    setFormCode(""); setFormCategory(""); setFormDesc(""); setFormUnit("SF");
    setFormRate(""); setFormTypes([]); setFormNotes("");
    setEditingId(null);
  }

  function startEdit(item: XactItem) {
    setEditingId(item.id);
    setFormCode(item.code);
    setFormCategory(item.category);
    setFormDesc(item.description);
    setFormUnit(item.unit);
    setFormRate(item.defaultRate?.toString() || "");
    setFormTypes(item.projectTypes);
    setFormNotes(item.notes || "");
    setShowCreate(true);
  }

  async function handleSave() {
    if (!formCode.trim() || !formCategory.trim() || !formDesc.trim()) return;
    setSaving(true);
    try {
      const payload = {
        code: formCode, category: formCategory, description: formDesc,
        unit: formUnit, defaultRate: formRate || null,
        projectTypes: formTypes, notes: formNotes,
      };
      const url = editingId ? `/api/xact-library/${editingId}` : "/api/xact-library";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        setShowCreate(false);
        resetForm();
        await fetchItems();
      }
    } catch {}
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this line item from the library?")) return;
    await fetch(`/api/xact-library/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function toggleFav(item: XactItem) {
    await fetch(`/api/xact-library/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !item.favorite }),
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, favorite: !i.favorite } : i)));
  }

  // Group items by category for display
  const grouped = useMemo(() => {
    const map: Record<string, XactItem[]> = {};
    items.forEach((item) => {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Xactimate Code Library</h1>
          <p className="text-xs text-slate-500 mt-0.5">{items.length} line items{categories.length > 0 && ` across ${categories.length} categories`}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && items.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Seed Default Codes
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => { resetForm(); setShowCreate(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus size={14} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search codes or descriptions..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-lg">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-lg">
          <option value="">All Project Types</option>
          {PROJECT_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button
          onClick={() => setFavOnly(!favOnly)}
          className={`flex items-center gap-1 px-3 py-2 text-xs rounded-lg border transition ${
            favOnly ? "bg-amber-50 border-amber-300 text-amber-700" : "border-slate-200 text-slate-500 hover:border-amber-300"
          }`}
        >
          <Star size={12} className={favOnly ? "fill-amber-400" : ""} /> Favorites
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-sm text-slate-400">
          <Loader2 size={18} className="animate-spin mr-2" /> Loading library...
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="text-center py-12">
          <Filter size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">
            {search || filterCat || filterType || favOnly ? "No items match your filters" : "No line items yet. Seed the library with common environmental codes to get started."}
          </p>
        </div>
      )}

      {/* Grouped list */}
      {!loading && grouped.map(([cat, catItems]) => (
        <div key={cat} className="space-y-1">
          <div className="flex items-center gap-2 sticky top-0 bg-white/95 backdrop-blur-sm py-2 z-10">
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${CATEGORY_COLORS[cat] || "bg-slate-100 text-slate-600"}`}>
              {cat}
            </span>
            <span className="text-xs text-slate-400">{catItems.length} items</span>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-medium text-slate-500 w-8"></th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Code</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Description</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500 w-16">Unit</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500 w-20">Rate</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500 w-28">Types</th>
                  {canEdit && <th className="w-16"></th>}
                </tr>
              </thead>
              <tbody>
                {catItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <button onClick={() => toggleFav(item)} className="text-slate-300 hover:text-amber-400 transition">
                        <Star size={13} className={item.favorite ? "fill-amber-400 text-amber-400" : ""} />
                      </button>
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-slate-700">{item.code}</td>
                    <td className="px-3 py-2 text-slate-600">{item.description}</td>
                    <td className="px-3 py-2 text-slate-500">{item.unit}</td>
                    <td className="px-3 py-2 text-slate-500">{item.defaultRate ? `$${item.defaultRate.toFixed(2)}` : "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-0.5">
                        {item.projectTypes.map((t) => (
                          <span key={t} className="inline-flex px-1 py-0 rounded text-[9px] bg-slate-100 text-slate-500">{t}</span>
                        ))}
                      </div>
                    </td>
                    {canEdit && (
                      <td className="px-2 py-2 text-right">
                        <button onClick={() => startEdit(item)} className="p-1 text-slate-300 hover:text-indigo-600 transition"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-300 hover:text-red-500 transition"><Trash2 size={13} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowCreate(false); resetForm(); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">{editingId ? "Edit Line Item" : "Add Line Item"}</h3>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Xact Code *</label>
                  <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="ACM RBAG" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category *</label>
                  <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="ACM" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description *</label>
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Asbestos removal - bagged material" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Unit *</label>
                  <select value={formUnit} onChange={(e) => setFormUnit(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Default Rate</label>
                  <input type="number" value={formRate} onChange={(e) => setFormRate(e.target.value)} step="0.01" placeholder="0.00" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Project Types</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PROJECT_TYPE_OPTIONS.map((t) => (
                    <label key={t.value} className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formTypes.includes(t.value)}
                        onChange={(e) => setFormTypes(e.target.checked ? [...formTypes, t.value] : formTypes.filter((x) => x !== t.value))}
                        className="rounded border-slate-300"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800">Cancel</button>
              <button onClick={handleSave} disabled={saving || !formCode.trim() || !formCategory.trim() || !formDesc.trim()} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingId ? "Update" : "Add to Library"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
