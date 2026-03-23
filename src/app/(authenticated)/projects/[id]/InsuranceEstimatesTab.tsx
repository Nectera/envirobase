"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus, Loader2, X, Trash2, Save, ChevronDown, ChevronRight,
  Send, CheckCircle2, XCircle, Search, Building2, Phone, Mail,
  FileText, Zap,
} from "lucide-react";

type LineItem = {
  id: string;
  xactItemId: string | null;
  xactCode: string;
  description: string;
  category: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sortOrder: number;
  notes: string | null;
  room: string | null;
};

type Estimate = {
  id: string;
  number: number;
  type: string;
  title: string | null;
  status: string;
  totalAmount: number;
  approvedAmount: number | null;
  notes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  deniedAt: string | null;
  denialReason: string | null;
  createdAt: string;
  lineItems: LineItem[];
};

type Communication = {
  id: string;
  type: string;
  direction: string;
  subject: string;
  body: string | null;
  contactName: string | null;
  date: string | null;
  createdAt: string;
};

type Carrier = {
  id: string;
  carrierName: string;
  adjusterName: string | null;
  adjusterEmail: string | null;
  adjusterPhone: string | null;
  claimNumber: string | null;
  policyNumber: string | null;
  dateOfLoss: string | null;
  deductible: number | null;
  notes: string | null;
  communications: Communication[];
};

type XactItem = {
  id: string;
  code: string;
  category: string;
  description: string;
  unit: string;
  defaultRate: number | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-700",
  revision_requested: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  denied: "Denied",
  revision_requested: "Revision Requested",
};

export default function InsuranceEstimatesTab({ projectId, projectType }: { projectId: string; projectType: string }) {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const userRole = (sessionData?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";

  // Sub-tabs
  const [subTab, setSubTab] = useState<"estimates" | "carrier" | "actual">("estimates");

  // ── Estimates state ──
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [estLoading, setEstLoading] = useState(true);
  const [expandedEst, setExpandedEst] = useState<string | null>(null);
  const [creatingEst, setCreatingEst] = useState(false);
  const [newEstType, setNewEstType] = useState("original");
  const [newEstTitle, setNewEstTitle] = useState("");
  const [savingEst, setSavingEst] = useState(false);

  // Line item add
  const [addingToEst, setAddingToEst] = useState<string | null>(null);
  const [xactSearch, setXactSearch] = useState("");
  const [xactResults, setXactResults] = useState<XactItem[]>([]);
  const [xactSearching, setXactSearching] = useState(false);
  const [lineDesc, setLineDesc] = useState("");
  const [lineCode, setLineCode] = useState("");
  const [lineUnit, setLineUnit] = useState("SF");
  const [lineQty, setLineQty] = useState("");
  const [linePrice, setLinePrice] = useState("");
  const [lineRoom, setLineRoom] = useState("");
  const [lineXactId, setLineXactId] = useState<string | null>(null);
  const [savingLine, setSavingLine] = useState(false);

  // Scope sheet
  const [loadingScope, setLoadingScope] = useState(false);

  // ── Carrier state ──
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierLoading, setCarrierLoading] = useState(false);
  const [showCarrierForm, setShowCarrierForm] = useState(false);
  const [cName, setCName] = useState("");
  const [cAdjuster, setCAdjuster] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cClaim, setCClaim] = useState("");
  const [cPolicy, setCPolicy] = useState("");
  const [cDol, setCDol] = useState("");
  const [cDeductible, setCDeductible] = useState("");
  const [cNotes, setCNotes] = useState("");
  const [savingCarrier, setSavingCarrier] = useState(false);

  // Communication log
  const [showCommForm, setShowCommForm] = useState<string | null>(null);
  const [commType, setCommType] = useState("email");
  const [commDir, setCommDir] = useState("outbound");
  const [commSubject, setCommSubject] = useState("");
  const [commBody, setCommBody] = useState("");
  const [commDate, setCommDate] = useState("");
  const [savingComm, setSavingComm] = useState(false);

  // ── Estimate vs Actual state ──
  const [actualData, setActualData] = useState<{ totalEstimated: number; totalApproved: number; totalActualLabor: number; totalActualHours: number } | null>(null);
  const [actualLoading, setActualLoading] = useState(false);

  // ── Fetch estimates ──
  useEffect(() => {
    setEstLoading(true);
    fetch(`/api/project-estimates?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setEstimates(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setEstLoading(false));
  }, [projectId]);

  // ── Fetch carrier info ──
  useEffect(() => {
    if (subTab !== "carrier") return;
    setCarrierLoading(true);
    fetch(`/api/projects/${projectId}/carrier`)
      .then((r) => r.json())
      .then((data) => setCarriers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setCarrierLoading(false));
  }, [subTab, projectId]);

  // ── Fetch actual vs estimated ──
  useEffect(() => {
    if (subTab !== "actual") return;
    setActualLoading(true);

    const totalEstimated = estimates.reduce((s, e) => s + e.totalAmount, 0);
    const totalApproved = estimates.filter((e) => e.status === "approved").reduce((s, e) => s + (e.approvedAmount || e.totalAmount), 0);

    fetch(`/api/time-clock?projectId=${projectId}`)
      .then((r) => r.json())
      .then((entries) => {
        const arr = Array.isArray(entries) ? entries : entries.entries || [];
        const totalHours = arr.reduce((sum: number, e: any) => sum + (e.totalHours || 0), 0);
        setActualData({ totalEstimated, totalApproved, totalActualLabor: 0, totalActualHours: totalHours });
      })
      .catch(() => setActualData({ totalEstimated, totalApproved, totalActualLabor: 0, totalActualHours: 0 }))
      .finally(() => setActualLoading(false));
  }, [subTab, projectId, estimates]);

  // ── Xact search ──
  useEffect(() => {
    if (!xactSearch || xactSearch.length < 2) { setXactResults([]); return; }
    const timer = setTimeout(async () => {
      setXactSearching(true);
      try {
        const res = await fetch(`/api/xact-library?search=${encodeURIComponent(xactSearch)}&projectType=${projectType}`);
        if (res.ok) {
          const data = await res.json();
          setXactResults(data.items?.slice(0, 10) || []);
        }
      } catch {}
      finally { setXactSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [xactSearch, projectType]);

  async function handleCreateEstimate() {
    setSavingEst(true);
    try {
      const res = await fetch("/api/project-estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type: newEstType, title: newEstTitle || undefined }),
      });
      if (res.ok) {
        const est = await res.json();
        setEstimates((prev) => [...prev, est]);
        setCreatingEst(false);
        setNewEstTitle("");
        setExpandedEst(est.id);
      }
    } catch {}
    finally { setSavingEst(false); }
  }

  async function handleSubmitEstimate(id: string) {
    const res = await fetch(`/api/project-estimates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEstimates((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
      router.refresh();
    }
  }

  async function handleApproveEstimate(id: string) {
    const res = await fetch(`/api/project-estimates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEstimates((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
      router.refresh();
    }
  }

  async function handleDenyEstimate(id: string) {
    const reason = prompt("Denial reason (optional):");
    const res = await fetch(`/api/project-estimates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deny", denialReason: reason || undefined }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEstimates((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
      router.refresh();
    }
  }

  async function handleDeleteEstimate(id: string) {
    if (!confirm("Delete this estimate?")) return;
    const res = await fetch(`/api/project-estimates/${id}`, { method: "DELETE" });
    if (res.ok) setEstimates((prev) => prev.filter((e) => e.id !== id));
  }

  function selectXactItem(item: XactItem) {
    setLineCode(item.code);
    setLineDesc(item.description);
    setLineUnit(item.unit);
    setLinePrice(item.defaultRate?.toString() || "");
    setLineXactId(item.id);
    setXactSearch("");
    setXactResults([]);
  }

  async function handleAddLineItem(estimateId: string) {
    if (!lineDesc.trim()) return;
    setSavingLine(true);
    try {
      const res = await fetch(`/api/project-estimates/${estimateId}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xactItemId: lineXactId,
          xactCode: lineCode,
          description: lineDesc,
          unit: lineUnit,
          quantity: parseFloat(lineQty) || 0,
          unitPrice: parseFloat(linePrice) || 0,
          room: lineRoom || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        const newItems = Array.isArray(created) ? created : [created];
        setEstimates((prev) =>
          prev.map((e) => {
            if (e.id !== estimateId) return e;
            const updatedItems = [...e.lineItems, ...newItems];
            const newTotal = updatedItems.reduce((sum, li) => sum + li.total, 0);
            return { ...e, lineItems: updatedItems, totalAmount: newTotal };
          })
        );
        resetLineForm();
      }
    } catch {}
    finally { setSavingLine(false); }
  }

  function resetLineForm() {
    setLineCode(""); setLineDesc(""); setLineUnit("SF"); setLineQty(""); setLinePrice("");
    setLineRoom(""); setLineXactId(null); setAddingToEst(null);
  }

  async function handleDeleteLineItem(estimateId: string, itemId: string) {
    const res = await fetch(`/api/project-estimates/${estimateId}/line-items/${itemId}`, { method: "DELETE" });
    if (res.ok) {
      setEstimates((prev) =>
        prev.map((e) => {
          if (e.id !== estimateId) return e;
          const updatedItems = e.lineItems.filter((li) => li.id !== itemId);
          const newTotal = updatedItems.reduce((sum, li) => sum + li.total, 0);
          return { ...e, lineItems: updatedItems, totalAmount: newTotal };
        })
      );
    }
  }

  async function handleGenerateScope(estimateId: string) {
    setLoadingScope(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/scope-sheet`);
      if (res.ok) {
        const data = await res.json();
        if (data.suggestedLines?.length > 0) {
          const addRes = await fetch(`/api/project-estimates/${estimateId}/line-items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              data.suggestedLines.map((sl: any) => ({
                xactItemId: sl.xactItemId,
                xactCode: sl.xactCode,
                description: sl.description,
                category: sl.category,
                unit: sl.unit,
                quantity: sl.quantity,
                unitPrice: sl.unitPrice,
                room: sl.room,
              }))
            ),
          });
          if (addRes.ok) {
            const newItems = await addRes.json();
            setEstimates((prev) =>
              prev.map((e) => {
                if (e.id !== estimateId) return e;
                const all = [...e.lineItems, ...(Array.isArray(newItems) ? newItems : [newItems])];
                return { ...e, lineItems: all, totalAmount: all.reduce((s, li) => s + li.total, 0) };
              })
            );
          }
        }
      }
    } catch {}
    finally { setLoadingScope(false); }
  }

  async function handleSaveCarrier() {
    if (!cName.trim()) return;
    setSavingCarrier(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/carrier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrierName: cName, adjusterName: cAdjuster, adjusterEmail: cEmail,
          adjusterPhone: cPhone, claimNumber: cClaim, policyNumber: cPolicy,
          dateOfLoss: cDol, deductible: cDeductible, notes: cNotes,
        }),
      });
      if (res.ok) {
        const carrier = await res.json();
        setCarriers((prev) => [carrier, ...prev]);
        setShowCarrierForm(false);
        setCName(""); setCAdjuster(""); setCEmail(""); setCPhone("");
        setCClaim(""); setCPolicy(""); setCDol(""); setCDeductible(""); setCNotes("");
      }
    } catch {}
    finally { setSavingCarrier(false); }
  }

  async function handleSaveComm(carrierId: string) {
    if (!commSubject.trim()) return;
    setSavingComm(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/carrier/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrierId, type: commType, direction: commDir,
          subject: commSubject, body: commBody, date: commDate || undefined,
        }),
      });
      if (res.ok) {
        const comm = await res.json();
        setCarriers((prev) =>
          prev.map((c) => (c.id === carrierId ? { ...c, communications: [comm, ...c.communications] } : c))
        );
        setShowCommForm(null);
        setCommType("email"); setCommDir("outbound"); setCommSubject("");
        setCommBody(""); setCommDate("");
      }
    } catch {}
    finally { setSavingComm(false); }
  }

  // ── Summary stats ──
  const totalEstimated = estimates.reduce((s, e) => s + e.totalAmount, 0);
  const totalApproved = estimates.filter((e) => e.status === "approved").reduce((s, e) => s + (e.approvedAmount || e.totalAmount), 0);
  const supplements = estimates.filter((e) => e.type === "supplement");

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { key: "estimates" as const, label: "Estimates & Supplements" },
          { key: "carrier" as const, label: "Insurance Carrier" },
          { key: "actual" as const, label: "Est. vs Actual" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition ${
              subTab === t.key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════ Estimates Sub-Tab ════════════ */}
      {subTab === "estimates" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap gap-4 text-xs">
            <div><span className="text-slate-500">Total Estimated:</span>{" "}<span className="font-semibold text-slate-700">${totalEstimated.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
            <div><span className="text-slate-500">Approved:</span>{" "}<span className="font-semibold text-emerald-600">${totalApproved.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
            <div><span className="text-slate-500">Supplements:</span>{" "}<span className="font-semibold text-slate-700">{supplements.length}</span></div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => setCreatingEst(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              <Plus size={14} /> {estimates.length === 0 ? "Create Original Estimate" : "Add Supplement"}
            </button>
          </div>

          {estLoading && <div className="flex items-center justify-center py-8 text-sm text-slate-400"><Loader2 size={18} className="animate-spin mr-2" /> Loading estimates...</div>}

          {!estLoading && estimates.length === 0 && (
            <div className="text-center py-8 text-sm text-slate-400"><FileText size={28} className="mx-auto mb-2 opacity-40" />No estimates yet. Create your original estimate to get started.</div>
          )}

          {/* Estimate cards */}
          {estimates.map((est) => (
            <div key={est.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-white cursor-pointer hover:bg-slate-50/50" onClick={() => setExpandedEst(expandedEst === est.id ? null : est.id)}>
                <div className="flex items-center gap-3">
                  {expandedEst === est.id ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">#{est.number}</span>
                      <span className="text-sm font-semibold text-slate-800">{est.title || `Estimate #${est.number}`}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[est.status] || ""}`}>{STATUS_LABELS[est.status] || est.status}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{est.lineItems.length} line items{est.type === "supplement" && " · Supplement"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-sm font-semibold text-slate-700">${est.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                    {est.approvedAmount != null && est.status === "approved" && (
                      <div className="text-[10px] text-emerald-600">Approved: ${est.approvedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                    )}
                  </div>
                </div>
              </div>

              {expandedEst === est.id && (
                <div className="border-t border-slate-200">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 flex-wrap">
                    {est.status === "draft" && (
                      <>
                        <button onClick={() => setAddingToEst(est.id)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded hover:bg-indigo-50 hover:border-indigo-300 transition"><Plus size={12} /> Add Line Item</button>
                        <button onClick={() => handleGenerateScope(est.id)} disabled={loadingScope} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded hover:bg-amber-50 hover:border-amber-300 transition">
                          {loadingScope ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Auto-Scope
                        </button>
                        <button onClick={() => handleSubmitEstimate(est.id)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"><Send size={12} /> Submit</button>
                      </>
                    )}
                    {est.status === "submitted" && isAdmin && (
                      <>
                        <button onClick={() => handleApproveEstimate(est.id)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"><CheckCircle2 size={12} /> Approve</button>
                        <button onClick={() => handleDenyEstimate(est.id)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 transition"><XCircle size={12} /> Deny</button>
                      </>
                    )}
                    {isAdmin && est.status !== "approved" && (
                      <button onClick={() => handleDeleteEstimate(est.id)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50 rounded transition ml-auto"><Trash2 size={12} /> Delete</button>
                    )}
                  </div>

                  {est.status === "denied" && est.denialReason && (
                    <div className="mx-4 mt-2 bg-red-50 border border-red-100 rounded p-2 text-xs text-red-700"><span className="font-semibold">Denial reason:</span> {est.denialReason}</div>
                  )}

                  {est.lineItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-3 py-2 font-medium text-slate-500">Code</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-500">Description</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-500 w-16">Room</th>
                            <th className="text-right px-3 py-2 font-medium text-slate-500 w-14">Qty</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-500 w-12">Unit</th>
                            <th className="text-right px-3 py-2 font-medium text-slate-500 w-20">Price</th>
                            <th className="text-right px-3 py-2 font-medium text-slate-500 w-20">Total</th>
                            {est.status === "draft" && <th className="w-8"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {est.lineItems.map((li) => (
                            <tr key={li.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-mono text-slate-600">{li.xactCode || "—"}</td>
                              <td className="px-3 py-2 text-slate-700">{li.description}</td>
                              <td className="px-3 py-2 text-slate-400">{li.room || "—"}</td>
                              <td className="px-3 py-2 text-right text-slate-700">{li.quantity}</td>
                              <td className="px-3 py-2 text-slate-500">{li.unit}</td>
                              <td className="px-3 py-2 text-right text-slate-700">${li.unitPrice.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-800">${li.total.toFixed(2)}</td>
                              {est.status === "draft" && (
                                <td className="px-2 py-2"><button onClick={() => handleDeleteLineItem(est.id, li.id)} className="p-0.5 text-slate-300 hover:text-red-500 transition"><Trash2 size={12} /></button></td>
                              )}
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-semibold">
                            <td colSpan={6} className="px-3 py-2 text-right text-slate-600">Total</td>
                            <td className="px-3 py-2 text-right text-slate-800">${est.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            {est.status === "draft" && <td></td>}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-xs text-slate-400">No line items yet. Add items from the Xact library or use Auto-Scope.</div>
                  )}

                  {addingToEst === est.id && (
                    <div className="px-4 py-3 border-t border-slate-200 bg-indigo-50/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Add Line Item</span>
                        <button onClick={resetLineForm} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                      </div>
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={xactSearch} onChange={(e) => setXactSearch(e.target.value)} placeholder="Search Xact library (type 2+ chars)..." className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        {xactResults.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {xactResults.map((xi) => (
                              <button key={xi.id} onClick={() => selectXactItem(xi)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 border-b border-slate-100 last:border-0">
                                <span className="font-mono font-semibold text-slate-600">{xi.code}</span>
                                <span className="text-slate-500 ml-2">{xi.description}</span>
                                <span className="text-slate-400 ml-1">({xi.unit})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        <input type="text" value={lineCode} onChange={(e) => setLineCode(e.target.value)} placeholder="Xact Code" className="col-span-1 px-2 py-1.5 text-xs border border-slate-200 rounded" />
                        <input type="text" value={lineDesc} onChange={(e) => setLineDesc(e.target.value)} placeholder="Description *" className="col-span-2 px-2 py-1.5 text-xs border border-slate-200 rounded" />
                        <input type="text" value={lineRoom} onChange={(e) => setLineRoom(e.target.value)} placeholder="Room" className="col-span-1 px-2 py-1.5 text-xs border border-slate-200 rounded" />
                        <input type="number" value={lineQty} onChange={(e) => setLineQty(e.target.value)} placeholder="Qty" className="col-span-1 px-2 py-1.5 text-xs border border-slate-200 rounded" />
                        <input type="number" value={linePrice} onChange={(e) => setLinePrice(e.target.value)} placeholder="Unit $" step="0.01" className="col-span-1 px-2 py-1.5 text-xs border border-slate-200 rounded" />
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={lineUnit} onChange={(e) => setLineUnit(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 rounded">
                          {["SF", "LF", "EA", "HR", "DA", "CF", "SQ", "TN", "CY", "GAL"].map((u) => <option key={u}>{u}</option>)}
                        </select>
                        <button onClick={() => handleAddLineItem(est.id)} disabled={savingLine || !lineDesc.trim()} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition">
                          {savingLine ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {creatingEst && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCreatingEst(false)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800">New Estimate</h3>
                  <button onClick={() => setCreatingEst(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                    <select value={newEstType} onChange={(e) => setNewEstType(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                      <option value="original">Original Estimate</option>
                      <option value="supplement">Supplement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Title (optional)</label>
                    <input type="text" value={newEstTitle} onChange={(e) => setNewEstTitle(e.target.value)} placeholder="e.g., Supplement #1 - Additional ACM Found" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                  <button onClick={() => setCreatingEst(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                  <button onClick={handleCreateEstimate} disabled={savingEst} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                    {savingEst ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ Carrier Sub-Tab ════════════ */}
      {subTab === "carrier" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Insurance Carrier Info</h3>
            <button onClick={() => setShowCarrierForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"><Plus size={14} /> Add Carrier</button>
          </div>

          {carrierLoading && <div className="flex items-center justify-center py-8 text-sm text-slate-400"><Loader2 size={18} className="animate-spin mr-2" /> Loading...</div>}

          {!carrierLoading && carriers.length === 0 && (
            <div className="text-center py-8 text-sm text-slate-400"><Building2 size={28} className="mx-auto mb-2 opacity-40" />No carrier info added yet</div>
          )}

          {carriers.map((carrier) => (
            <div key={carrier.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{carrier.carrierName}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                      {carrier.adjusterName && <span className="flex items-center gap-1"><span className="font-medium">Adjuster:</span> {carrier.adjusterName}</span>}
                      {carrier.adjusterPhone && <span className="flex items-center gap-1"><Phone size={11} /> {carrier.adjusterPhone}</span>}
                      {carrier.adjusterEmail && <span className="flex items-center gap-1"><Mail size={11} /> {carrier.adjusterEmail}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                      {carrier.claimNumber && <span><span className="font-medium">Claim #:</span> {carrier.claimNumber}</span>}
                      {carrier.policyNumber && <span><span className="font-medium">Policy #:</span> {carrier.policyNumber}</span>}
                      {carrier.dateOfLoss && <span><span className="font-medium">DOL:</span> {carrier.dateOfLoss}</span>}
                      {carrier.deductible != null && <span><span className="font-medium">Deductible:</span> ${carrier.deductible.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 px-4 py-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">Communication Log ({carrier.communications.length})</span>
                  <button onClick={() => setShowCommForm(carrier.id)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded hover:bg-indigo-50 transition"><Plus size={11} /> Log Entry</button>
                </div>

                {carrier.communications.length === 0 && <p className="text-xs text-slate-400 py-2">No communications logged yet</p>}

                {carrier.communications.map((comm) => (
                  <div key={comm.id} className="flex items-start gap-2 py-2 border-t border-slate-100 first:border-0">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${comm.direction === "inbound" ? "bg-blue-400" : "bg-emerald-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-medium ${comm.direction === "inbound" ? "text-blue-600" : "text-emerald-600"}`}>{comm.direction === "inbound" ? "Received" : "Sent"}</span>
                        <span className="text-slate-400">{comm.type}</span>
                        {comm.date && <span className="text-slate-400">{comm.date}</span>}
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{comm.subject}</p>
                      {comm.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{comm.body}</p>}
                    </div>
                  </div>
                ))}

                {showCommForm === carrier.id && (
                  <div className="mt-2 p-3 bg-indigo-50/30 rounded-lg space-y-2 border border-indigo-100">
                    <div className="grid grid-cols-3 gap-2">
                      <select value={commType} onChange={(e) => setCommType(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 rounded">
                        <option value="email">Email</option><option value="phone">Phone</option><option value="meeting">Meeting</option><option value="letter">Letter</option><option value="note">Note</option>
                      </select>
                      <select value={commDir} onChange={(e) => setCommDir(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 rounded">
                        <option value="outbound">Outbound</option><option value="inbound">Inbound</option>
                      </select>
                      <input type="date" value={commDate} onChange={(e) => setCommDate(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 rounded" />
                    </div>
                    <input type="text" value={commSubject} onChange={(e) => setCommSubject(e.target.value)} placeholder="Subject *" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
                    <textarea value={commBody} onChange={(e) => setCommBody(e.target.value)} placeholder="Details (optional)" rows={2} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSaveComm(carrier.id)} disabled={savingComm || !commSubject.trim()} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition">
                        {savingComm ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                      </button>
                      <button onClick={() => setShowCommForm(null)} className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {showCarrierForm && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCarrierForm(false)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800">Add Insurance Carrier</h3>
                  <button onClick={() => setShowCarrierForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Carrier Name *</label><input type="text" value={cName} onChange={(e) => setCName(e.target.value)} placeholder="State Farm, Allstate, etc." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Adjuster Name</label><input type="text" value={cAdjuster} onChange={(e) => setCAdjuster(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Adjuster Phone</label><input type="text" value={cPhone} onChange={(e) => setCPhone(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Adjuster Email</label><input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Claim Number</label><input type="text" value={cClaim} onChange={(e) => setCClaim(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Policy Number</label><input type="text" value={cPolicy} onChange={(e) => setCPolicy(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Date of Loss</label><input type="date" value={cDol} onChange={(e) => setCDol(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Deductible</label><input type="number" value={cDeductible} onChange={(e) => setCDeductible(e.target.value)} step="0.01" placeholder="0.00" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Notes</label><textarea value={cNotes} onChange={(e) => setCNotes(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                  <button onClick={() => setShowCarrierForm(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                  <button onClick={handleSaveCarrier} disabled={savingCarrier || !cName.trim()} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                    {savingCarrier ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Carrier
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ Estimate vs Actual Sub-Tab ════════════ */}
      {subTab === "actual" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Estimate vs. Actual</h3>

          {actualLoading && <div className="flex items-center justify-center py-8 text-sm text-slate-400"><Loader2 size={18} className="animate-spin mr-2" /> Calculating...</div>}

          {!actualLoading && actualData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wide text-slate-500">Total Estimated</p><p className="text-lg font-bold text-slate-800">${actualData.totalEstimated.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p></div>
                <div className="bg-white border border-slate-200 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wide text-slate-500">Carrier Approved</p><p className="text-lg font-bold text-emerald-600">${actualData.totalApproved.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p></div>
                <div className="bg-white border border-slate-200 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wide text-slate-500">Actual Labor Hours</p><p className="text-lg font-bold text-slate-800">{actualData.totalActualHours.toFixed(1)}</p></div>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Variance</p>
                  {actualData.totalApproved > 0 ? (
                    <p className={`text-lg font-bold ${actualData.totalApproved >= actualData.totalEstimated ? "text-emerald-600" : "text-red-600"}`}>
                      {actualData.totalApproved >= actualData.totalEstimated ? "+" : ""}{((actualData.totalApproved / actualData.totalEstimated - 1) * 100).toFixed(1)}%
                    </p>
                  ) : (<p className="text-lg font-bold text-slate-400">—</p>)}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 font-medium text-slate-500">Estimate</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-500">Type</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-500">Status</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-500">Estimated</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-500">Approved</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-500">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimates.map((est) => {
                      const approved = est.approvedAmount || 0;
                      const variance = est.status === "approved" && approved > 0 ? approved - est.totalAmount : null;
                      return (
                        <tr key={est.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 text-slate-700 font-medium">{est.title || `#${est.number}`}</td>
                          <td className="px-3 py-2 text-slate-500 capitalize">{est.type}</td>
                          <td className="px-3 py-2"><span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${STATUS_COLORS[est.status] || ""}`}>{STATUS_LABELS[est.status] || est.status}</span></td>
                          <td className="px-3 py-2 text-right text-slate-700">${est.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{est.status === "approved" ? `$${approved.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</td>
                          <td className="px-3 py-2 text-right">
                            {variance !== null ? (
                              <span className={`font-semibold ${variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{variance >= 0 ? "+" : ""}${variance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            ) : (<span className="text-slate-400">—</span>)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {estimates.length === 0 && <div className="text-center py-6 text-xs text-slate-400">Create estimates first to see the comparison</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
