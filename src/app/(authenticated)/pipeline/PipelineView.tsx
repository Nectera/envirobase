"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  FileSpreadsheet,
  Calendar,
  Receipt,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  GripVertical,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { hasProjectType } from "@/lib/utils";
import { useTranslation } from "@/components/LanguageProvider";

type Opportunity = {
  id: string;
  leadName: string;
  companyName: string;
  contactName: string;
  address: string;
  projectType: string;
  stage: string;
  value: number;
  profitMargin: number | null;
  isInsuranceJob: boolean;
  leadStatus?: string;
  wonDate: string | null;
  invoiceDate: string | null;
  paidDate: string | null;
  leadId: string;
  projectId: string | null;
  estimateId: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  estimateStatus: string | null;
  createdAt: string;
};

type PipelineViewProps = {
  opportunities: Opportunity[];
};

const SERVICE_TYPES = [
  { key: "all", labelKey: "common.all" },
  { key: "ASBESTOS", labelKey: "types.asbestos" },
  { key: "LEAD", labelKey: "types.lead" },
  { key: "METH", labelKey: "types.meth" },
  { key: "MOLD", labelKey: "types.mold" },
  { key: "SELECT_DEMO", labelKey: "types.selectDemo" },
  { key: "REBUILD", labelKey: "types.rebuild" },
];

const STAGES = [
  {
    key: "estimating",
    labelKey: "pipeline.estimating",
    color: "bg-amber-50 border-amber-300 text-amber-700",
    dropColor: "bg-amber-100 border-amber-400",
    icon: FileSpreadsheet,
  },
  {
    key: "scheduled",
    labelKey: "pipeline.scheduled",
    color: "bg-blue-50 border-blue-300 text-blue-700",
    dropColor: "bg-blue-100 border-blue-400",
    icon: Calendar,
  },
  {
    key: "invoiced",
    labelKey: "pipeline.invoiced",
    color: "bg-purple-50 border-purple-300 text-purple-700",
    dropColor: "bg-purple-100 border-purple-400",
    icon: Receipt,
  },
  {
    key: "paid",
    labelKey: "pipeline.paid",
    color: "bg-emerald-50 border-emerald-300 text-emerald-700",
    dropColor: "bg-emerald-100 border-emerald-400",
    icon: CheckCircle2,
  },
];

const TYPE_BADGE: Record<string, string> = {
  ASBESTOS: "bg-indigo-100 text-indigo-700",
  LEAD: "bg-amber-100 text-amber-700",
  METH: "bg-red-100 text-red-700",
  MOLD: "bg-teal-100 text-teal-700",
  SELECT_DEMO: "bg-orange-100 text-orange-700",
  REBUILD: "bg-violet-100 text-violet-700",
  SELECT_DEMO_REBUILD: "bg-orange-100 text-orange-700",
};

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function PipelineView({ opportunities }: PipelineViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeService, setActiveService] = useState("all");
  const [search, setSearch] = useState("");
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Local state for optimistic updates on drag
  const [localOpps, setLocalOpps] = useState(opportunities);

  // Scheduling gate modal state
  const [scheduleModal, setScheduleModal] = useState<{
    oppId: string;
    leadName: string;
  } | null>(null);
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectEndDate, setProjectEndDate] = useState("");
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const [includeSunday, setIncludeSunday] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Error toast for missing estimate
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // QB sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSyncPayments = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/quickbooks/sync-payments", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.updated > 0) {
          setSyncResult(`${data.updated} invoice(s) updated to Paid`);
          router.refresh();
        } else {
          setSyncResult(`Checked ${data.checked} invoices — all up to date`);
        }
      } else {
        setSyncResult(data.error || "Sync failed");
      }
    } catch {
      setSyncResult("Failed to connect to QuickBooks");
    }
    setSyncing(false);
    setTimeout(() => setSyncResult(null), 4000);
  };

  const filtered = useMemo(() => {
    let result = [...localOpps];
    if (activeService !== "all") {
      // Match if the lead's projectType contains the selected service type
      if (activeService === "SELECT_DEMO") {
        result = result.filter(
          (o) => hasProjectType(o.projectType, "SELECT_DEMO") || hasProjectType(o.projectType, "SELECT_DEMO_REBUILD")
        );
      } else {
        result = result.filter((o) => hasProjectType(o.projectType, activeService));
      }
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.leadName.toLowerCase().includes(q) ||
          o.companyName.toLowerCase().includes(q) ||
          o.address.toLowerCase().includes(q)
      );
    }
    return result;
  }, [localOpps, activeService, search]);

  const totalValue = filtered.reduce((sum, o) => sum + o.value, 0);

  // Drag-and-drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, oppId: string) => {
      e.dataTransfer.setData("text/plain", oppId);
      e.dataTransfer.effectAllowed = "move";
      setDraggingId(oppId);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, stageKey: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverStage(stageKey);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStage: string) => {
      e.preventDefault();
      setDragOverStage(null);
      setDraggingId(null);

      const oppId = e.dataTransfer.getData("text/plain");
      if (!oppId) return;

      const opp = localOpps.find((o) => o.id === oppId);
      if (!opp || opp.stage === newStage) return;

      // Moving to "scheduled" — show date picker popup
      if (newStage === "scheduled") {
        setScheduleModal({
          oppId: opp.id,
          leadName: opp.companyName || opp.leadName,
        });
        setProjectStartDate("");
        setProjectEndDate("");
        setIncludeSaturday(false);
        setIncludeSunday(false);
        setScheduleError("");
        return;
      }

      // For other stages, proceed normally
      // Optimistic update
      setLocalOpps((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, stage: newStage } : o))
      );

      // Persist the stage override
      try {
        await fetch(`/api/pipeline/${oppId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipelineStage: newStage }),
        });
      } catch {
        // Revert on error
        setLocalOpps((prev) =>
          prev.map((o) => (o.id === oppId ? { ...o, stage: opp.stage } : o))
        );
      }
    },
    [localOpps]
  );

  const handleScheduleConfirm = async () => {
    if (!scheduleModal) return;
    if (!projectStartDate) {
      setScheduleError("Project start date is required.");
      return;
    }

    setScheduleLoading(true);
    setScheduleError("");

    try {
      const res = await fetch(`/api/pipeline/${scheduleModal.oppId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineStage: "scheduled",
          projectStartDate,
          projectEndDate: projectEndDate || undefined,
          includeSaturday,
          includeSunday,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setScheduleError(err.error || "Failed to schedule.");
        setScheduleLoading(false);
        return;
      }

      // Optimistic update
      setLocalOpps((prev) =>
        prev.map((o) =>
          o.id === scheduleModal.oppId ? { ...o, stage: "scheduled" } : o
        )
      );

      setScheduleModal(null);
      setProjectStartDate("");
      setProjectEndDate("");
      setIncludeSaturday(false);
      setIncludeSunday(false);
      router.refresh();
    } catch {
      setScheduleError("Network error. Please try again.");
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDragEnd = useCallback(() => {
    setDragOverStage(null);
    setDraggingId(null);
  }, []);

  const handleMarkPaid = async (invoiceId: string) => {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "paid",
        paidDate: new Date().toISOString(),
        paidAmount: 0,
      }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Error toast */}
      {errorToast && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <AlertCircle size={14} />
          <span className="text-sm">{errorToast}</span>
          <button onClick={() => setErrorToast(null)} className="ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {syncResult && (
        <div className="fixed top-4 right-4 z-50 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2">
          <RefreshCw size={14} />
          <span className="text-sm">{syncResult}</span>
          <button onClick={() => setSyncResult(null)} className="ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">
              {t("pipeline.title")}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("pipeline.subtitle")}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl md:text-2xl font-bold text-emerald-600">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-xs text-slate-500">
              {filtered.length} {t("pipeline.opportunities")}
            </div>
          </div>
        </div>
        <button
          onClick={handleSyncPayments}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 disabled:opacity-50 transition"
          title="Sync payment status from QuickBooks"
        >
          <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
          {syncing ? t("pipeline.syncing") : t("pipeline.syncQB")}
        </button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {STAGES.map((stage) => {
          const stageOpps = filtered.filter((o) => o.stage === stage.key);
          const stageValue = stageOpps.reduce((sum, o) => sum + o.value, 0);
          const StageIcon = stage.icon;
          return (
            <div
              key={stage.key}
              className="bg-white border border-slate-100 shadow-sm rounded-2xl px-3 py-2"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <StageIcon size={14} className={stage.color} />
                <span className="text-xs font-medium text-slate-600">
                  {t(stage.labelKey)}
                </span>
                <span className="text-xs font-bold text-slate-800 ml-auto">
                  {stageOpps.length}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {formatCurrency(stageValue)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Service type tabs + search */}
      <div className="space-y-2">
        <div className="flex gap-0.5 bg-slate-100 rounded-full p-0.5 overflow-x-auto no-scrollbar">
          {SERVICE_TYPES.map((type) => {
            let typeCount: number;
            if (type.key === "all") {
              typeCount = localOpps.length;
            } else if (type.key === "SELECT_DEMO") {
              typeCount = localOpps.filter(
                (o) => hasProjectType(o.projectType, "SELECT_DEMO") || hasProjectType(o.projectType, "SELECT_DEMO_REBUILD")
              ).length;
            } else {
              typeCount = localOpps.filter((o) => hasProjectType(o.projectType, type.key)).length;
            }
            return (
              <button
                key={type.key}
                onClick={() => setActiveService(type.key)}
                className={`px-2.5 py-1 text-xs rounded-full transition whitespace-nowrap shrink-0 ${
                  activeService === type.key
                    ? "bg-white text-slate-900 shadow-sm font-medium"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t(type.labelKey)}
                <span className="ml-1 text-[9px] font-semibold bg-slate-200 text-slate-600 px-1 py-0.5 rounded-full">
                  {typeCount}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pipeline.search")}
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-full"
          />
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-2 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageOpps = filtered.filter((o) => o.stage === stage.key);
          const stageValue = stageOpps.reduce((sum, o) => sum + o.value, 0);
          const StageIcon = stage.icon;
          const isDropTarget = dragOverStage === stage.key;

          return (
            <div
              key={stage.key}
              className="flex-1 min-w-[240px]"
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              {/* Column header */}
              <div className={`rounded-t-[20px] px-2.5 py-1.5 border-b-2 ${stage.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <StageIcon size={12} />
                    <span className="text-[11px] font-semibold">{t(stage.labelKey)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {stageValue > 0 && (
                      <span className="text-[9px] opacity-70">
                        {formatCurrency(stageValue)}
                      </span>
                    )}
                    <span className="text-[9px] font-medium bg-white/60 px-1 py-0.5 rounded">
                      {stageOpps.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Column body — cards */}
              <div
                className={`rounded-b-[20px] border border-t-0 min-h-[200px] p-1.5 space-y-1 transition-colors ${
                  isDropTarget
                    ? `${stage.dropColor} border-dashed`
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                {stageOpps.map((opp) => (
                  <div
                    key={opp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opp.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-2xl border border-slate-200 px-2 py-1.5 hover:border-[#7BC143] transition shadow-sm cursor-grab active:cursor-grabbing ${
                      draggingId === opp.id ? "opacity-40" : ""
                    }`}
                  >
                    {/* Top row: company + value */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="text-[11px] font-medium text-slate-800 leading-tight truncate">
                        {opp.companyName || opp.leadName}
                      </div>
                      <div className="text-[11px] font-bold text-emerald-600 whitespace-nowrap">
                        {formatCurrency(opp.value)}
                      </div>
                    </div>

                    {/* Contact / lead */}
                    <div className="text-[10px] text-slate-500 truncate leading-tight">
                      {opp.contactName || opp.leadName}
                      {opp.address ? ` — ${opp.address}` : ""}
                    </div>

                    {/* Badges + date row */}
                    <div className="flex items-center gap-1 mt-1">
                      {activeService === "all" && (opp.projectType || "").split(",").filter(Boolean).map((pt: string) => (
                        <span
                          key={pt}
                          className={`text-[8px] font-semibold px-1 py-0.5 rounded ${
                            TYPE_BADGE[pt.trim()] ||
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {pt.trim() === "SELECT_DEMO_REBUILD" || pt.trim() === "SELECT_DEMO" ? "DEMO" : pt.trim()}
                        </span>
                      ))}
                      {opp.isInsuranceJob && (
                        <span className="text-[8px] font-semibold px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                          INS
                        </span>
                      )}
                      {stage.key === "estimating" && opp.leadStatus && opp.leadStatus !== "won" && (
                        <span className="text-[8px] font-semibold px-1 py-0.5 rounded bg-yellow-100 text-yellow-700">
                          {opp.leadStatus.replace(/_/g, " ").toUpperCase()}
                        </span>
                      )}
                      {stage.key === "estimating" && opp.leadStatus === "won" && (
                        <span className="text-[8px] font-semibold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          WON
                        </span>
                      )}
                      {opp.estimateStatus && (
                        <span className={`text-[8px] font-semibold px-1 py-0.5 rounded ${
                          opp.estimateStatus === "approved" || opp.estimateStatus === "converted" || opp.estimateStatus === "accepted"
                            ? "bg-emerald-100 text-emerald-700"
                            : opp.estimateStatus === "sent"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-slate-100 text-slate-500"
                        }`}>
                          EST: {opp.estimateStatus}
                        </span>
                      )}
                      {opp.profitMargin !== null && (
                        <span className="text-[8px] text-slate-400">
                          {(opp.profitMargin * 100).toFixed(0)}% margin
                        </span>
                      )}
                      {opp.invoiceNumber && (
                        <span className="text-[8px] text-slate-400 ml-auto">
                          {opp.invoiceNumber}
                        </span>
                      )}
                      <span className="text-[8px] text-slate-400 ml-auto">
                        {stage.key === "paid" && opp.paidDate
                          ? formatDate(opp.paidDate)
                          : stage.key === "invoiced" && opp.invoiceDate
                            ? formatDate(opp.invoiceDate)
                            : opp.wonDate
                              ? formatDate(opp.wonDate)
                              : ""}
                      </span>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-slate-100">
                      {stage.key === "estimating" && !opp.estimateId && (
                        <Link
                          href={`/estimates/consultation?leadId=${opp.leadId}`}
                          className="text-[9px] font-medium text-blue-600 hover:text-blue-700"
                        >
                          {t("pipeline.createEstimate")}
                        </Link>
                      )}
                      {stage.key === "estimating" && opp.estimateId && (
                        <Link
                          href={`/estimates/consultation/${opp.estimateId}`}
                          className="text-[9px] font-medium text-blue-600 hover:text-blue-700"
                        >
                          {t("pipeline.viewEstimate")}
                        </Link>
                      )}
                      {stage.key === "scheduled" && opp.estimateId && (
                        <Link
                          href={`/estimates/consultation/${opp.estimateId}`}
                          className="text-[9px] font-medium text-blue-600 hover:text-blue-700"
                        >
                          {t("pipeline.createInvoice")}
                        </Link>
                      )}
                      {stage.key === "invoiced" && opp.invoiceId && (
                        <>
                          <button
                            onClick={() => handleMarkPaid(opp.invoiceId!)}
                            className="text-[9px] font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            {t("pipeline.markPaid")}
                          </button>
                          <Link
                            href={`/invoices/${opp.invoiceId}`}
                            className="text-[9px] font-medium text-slate-500 hover:text-slate-700"
                          >
                            {t("common.view")}
                          </Link>
                        </>
                      )}
                      {stage.key === "paid" && opp.invoiceId && (
                        <Link
                          href={`/invoices/${opp.invoiceId}`}
                          className="text-[9px] font-medium text-slate-500 hover:text-slate-700"
                        >
                          {t("pipeline.viewInvoice")}
                        </Link>
                      )}
                      <Link
                        href={`/leads/${opp.leadId}`}
                        className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full ml-auto transition"
                      >
                        {t("pipeline.viewLead")}
                      </Link>
                    </div>
                  </div>
                ))}

                {stageOpps.length === 0 && (
                  <div className="text-[10px] text-slate-400 text-center py-8">
                    {t("pipeline.noOpportunities")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule Project Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  {t("pipeline.scheduleProject")}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {scheduleModal.leadName}
                </p>
              </div>
              <button
                onClick={() => {
                  setScheduleModal(null);
                  setProjectStartDate("");
                  setProjectEndDate("");
                  setIncludeSaturday(false);
                  setIncludeSunday(false);
                  setScheduleError("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              {t("pipeline.scheduleDescription")}
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t("pipeline.startDate")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t("pipeline.endDate")}
                  </label>
                  <input
                    type="date"
                    value={projectEndDate}
                    onChange={(e) => setProjectEndDate(e.target.value)}
                    min={projectStartDate || undefined}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
                  />
                </div>
              </div>

              {/* Weekend toggles */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  {t("pipeline.includeWeekends")}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIncludeSaturday(!includeSaturday)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition ${
                      includeSaturday
                        ? "bg-[#7BC143] text-white border-[#7BC143]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {t("pipeline.saturday")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeSunday(!includeSunday)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition ${
                      includeSunday
                        ? "bg-[#7BC143] text-white border-[#7BC143]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {t("pipeline.sunday")}
                  </button>
                </div>
              </div>

              {/* Working days calculation */}
              {projectStartDate && projectEndDate && (
                <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">
                  {(() => {
                    const start = new Date(projectStartDate + "T00:00:00");
                    const end = new Date(projectEndDate + "T00:00:00");
                    let days = 0;
                    const cur = new Date(start);
                    while (cur <= end) {
                      const dow = cur.getDay();
                      if (dow === 0 && !includeSunday) { /* skip */ }
                      else if (dow === 6 && !includeSaturday) { /* skip */ }
                      else { days++; }
                      cur.setDate(cur.getDate() + 1);
                    }
                    return (
                      <span>
                        <span className="font-semibold text-slate-800">{days}</span> working day{days !== 1 ? "s" : ""}
                        {(!includeSaturday || !includeSunday) && (
                          <span className="text-slate-400">
                            {" "}(excl. {[!includeSaturday && "Sat", !includeSunday && "Sun"].filter(Boolean).join(" & ")})
                          </span>
                        )}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            {scheduleError && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle size={12} />
                {scheduleError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setScheduleModal(null);
                  setProjectStartDate("");
                  setProjectEndDate("");
                  setIncludeSaturday(false);
                  setIncludeSunday(false);
                  setScheduleError("");
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleScheduleConfirm}
                disabled={scheduleLoading}
                className="px-4 py-2 text-sm bg-[#7BC143] text-white rounded-full hover:bg-[#6aad38] disabled:opacity-50"
              >
                {scheduleLoading ? t("pipeline.scheduling") : t("pipeline.confirmSchedule")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
