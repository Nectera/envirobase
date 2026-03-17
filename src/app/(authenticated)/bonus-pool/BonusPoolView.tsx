"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/LanguageProvider";
import {
  Gift, DollarSign, Clock, Users, ChevronLeft, ChevronRight,
  Settings, Save, Loader2, Star, CheckCircle2, TrendingUp,
  AlertTriangle, Award, Info, RefreshCw,
} from "lucide-react";

type Worker = { id: string; name: string; position: string };
type PositionSplit = {
  pct: number;
  pool: number;
  headcount: number;
  perPerson: number;
  weight?: number;
};

export default function BonusPoolView({
  isAdmin,
  workers,
  userPosition,
}: {
  isAdmin: boolean;
  workers: Worker[];
  userPosition?: string | null;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configData, setConfigData] = useState<any>(null);
  const [configSaving, setConfigSaving] = useState(false);

  // Override state
  const [overrideMode, setOverrideMode] = useState(false);
  const [overridePcts, setOverridePcts] = useState<Record<string, number>>({});

  // High performer
  const [hpWorkerId, setHpWorkerId] = useState("");
  const [hpAmount, setHpAmount] = useState("");

  // Google reviews
  const [reviewCount, setReviewCount] = useState(0);
  const [trackedReviews, setTrackedReviews] = useState<any[]>([]);
  const [showReviewDetails, setShowReviewDetails] = useState(false);

  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const fetchPool = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bonus-pool?month=${month}`);
      const json = await res.json();
      setData(json);
      setOverrideMode(json.isOverridden || false);
      if (json.isOverridden && json.positionSplits) {
        const pcts: Record<string, number> = {};
        for (const [pos, split] of Object.entries(json.positionSplits)) {
          pcts[pos] = (split as PositionSplit).pct;
        }
        setOverridePcts(pcts);
      }
      setHpWorkerId(json.highPerformerWorkerId || "");
      setHpAmount(json.highPerformerAmount?.toString() || "");
      setReviewCount(json.googleReviewCount || 0);
      setNotes(json.notes || "");
      // Also fetch tracked review requests for this month
      try {
        const rrRes = await fetch(`/api/review-requests?month=${month}`);
        if (rrRes.ok) {
          const rrData = await rrRes.json();
          setTrackedReviews(rrData.requests || []);
        }
      } catch {
        // Non-critical
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchPool(); }, [fetchPool]);

  const fetchConfig = async () => {
    const res = await fetch("/api/bonus-pool/config");
    const json = await res.json();
    setConfigData(json);
    setShowConfig(true);
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    try {
      await fetch("/api/bonus-pool/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData),
      });
      setShowConfig(false);
      fetchPool(); // Refresh with new config
    } catch {} finally {
      setConfigSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const hpWorker = workers.find((w) => w.id === hpWorkerId);
      const body: any = {
        month,
        googleReviewCount: reviewCount,
        highPerformerWorkerId: hpWorkerId || null,
        highPerformerName: hpWorker?.name || null,
        highPerformerAmount: parseFloat(hpAmount) || 0,
        notes,
        status: "draft",
      };
      if (overrideMode && Object.keys(overridePcts).length > 0) {
        body.overridePositionSplits = overridePcts;
      }
      await fetch("/api/bonus-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchPool();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm("Finalize this month's bonus pool? This marks it as approved.")) return;
    setSaving(true);
    try {
      const hpWorker = workers.find((w) => w.id === hpWorkerId);
      await fetch("/api/bonus-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          googleReviewCount: reviewCount,
          highPerformerWorkerId: hpWorkerId || null,
          highPerformerName: hpWorker?.name || null,
          highPerformerAmount: parseFloat(hpAmount) || 0,
          notes,
          status: "finalized",
          ...(overrideMode && Object.keys(overridePcts).length > 0
            ? { overridePositionSplits: overridePcts }
            : {}),
        }),
      });
      fetchPool();
    } catch {} finally {
      setSaving(false);
    }
  };

  const navigateMonth = (dir: number) => {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() + dir);
    setMonth(d.toISOString().slice(0, 7));
  };

  const monthLabel = new Date(month + "-01").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const poolTotal = data?.poolAmount || 0;
  const grandTotal =
    poolTotal + (data?.googleReviewTotal || 0) + (parseFloat(hpAmount) || 0);

  // Position split entries (sorted by pool descending)
  const splitEntries: [string, PositionSplit][] = data?.positionSplits
    ? (Object.entries(data.positionSplits) as [string, PositionSplit][]).sort(
        (a, b) => b[1].pool - a[1].pool
      )
    : [];

  const overridePctTotal = Object.values(overridePcts).reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Gift size={20} className="text-indigo-500 flex-shrink-0" />
            {t("bonusPool.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 hidden sm:block">
            Hours saved on projects fund the team bonus pool
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={fetchConfig}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 flex-shrink-0"
          >
            <Settings size={14} /> <span className="hidden sm:inline">Configure</span><span className="sm:hidden">Config</span>
          </button>
        )}
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 min-w-[160px] text-center">
          {monthLabel}
        </h2>
        <button
          onClick={() => navigateMonth(1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          {/* Status badge */}
          {data?.status === "finalized" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">
                This month&apos;s bonus pool has been finalized.
              </span>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5 flex items-center gap-1">
                <Clock size={11} /> Hours Saved
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {(data?.totalHoursSaved || 0).toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {(data?.totalEstimatedHours || 0).toFixed(1)} est — {(data?.totalActualHours || 0).toFixed(1)} act
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5 flex items-center gap-1">
                <DollarSign size={11} /> {t("bonusPool.projectPool")}
              </div>
              <div className="text-lg sm:text-xl font-bold text-emerald-600">
                {fmt(poolTotal)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                @ {fmt(data?.ratePerHour || 17)}{t("bonusPool.perHour")}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5 flex items-center gap-1">
                <TrendingUp size={11} /> Projects
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {data?.completedProjectCount || 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Completed this month
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5 flex items-center gap-1">
                <Gift size={11} /> {t("bonusPool.grandTotal")}
              </div>
              <div className="text-lg sm:text-xl font-bold text-indigo-600">
                {fmt(grandTotal)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {t("bonusPool.poolReviewsHP")}
              </div>
            </div>
          </div>

          {/* Non-admin: Your Estimated Bonus card */}
          {!isAdmin && userPosition && (
            <div className="bg-white border border-slate-200 rounded-xl mb-6 p-6">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Gift size={16} className="text-indigo-500" />
                {t("bonusPool.yourEstimatedBonus")}
              </h3>
              {(() => {
                const myEntry = splitEntries.find(([pos]) => pos === userPosition);
                if (!myEntry) {
                  return (
                    <p className="text-sm text-slate-400">
                      No bonus data for your position ({userPosition}) this month.
                    </p>
                  );
                }
                const [, split] = myEntry;
                return (
                  <div className="text-center py-4">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">
                      {fmt(split.perPerson)}
                    </div>
                    <div className="text-xs text-slate-400">
                      Per person for {userPosition} ({split.headcount} {split.headcount === 1 ? "person" : "people"})
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Position splits (admin only) */}
          {isAdmin && <div className="bg-white border border-slate-200 rounded-xl mb-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Users size={16} className="text-indigo-500" />
                {t("bonusPool.positionBreakdown")}
              </h3>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  {data?.isOverridden && !overrideMode && (
                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                      Custom %
                    </span>
                  )}
                  <button
                    onClick={() => {
                      if (!overrideMode) {
                        // Initialize override pcts from current splits
                        const pcts: Record<string, number> = {};
                        for (const [pos, split] of splitEntries) {
                          pcts[pos] = split.pct;
                        }
                        setOverridePcts(pcts);
                      }
                      setOverrideMode(!overrideMode);
                    }}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {overrideMode ? "Use auto weights" : "Override %"}
                  </button>
                </div>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {splitEntries.map(([pos, split]) => (
                <div key={pos} className="px-4 py-3">
                  {/* Mobile: stacked layout / Desktop: row layout */}
                  <div className="flex items-center justify-between mb-1 sm:mb-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-sm font-medium text-slate-800">{pos}</div>
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                        {split.headcount} {split.headcount === 1 ? "person" : "people"}
                      </span>
                    </div>
                    {/* Per person - prominent on all screens */}
                    <div className="text-right">
                      <div className="text-sm font-semibold text-emerald-600">
                        {fmt(split.perPerson)}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">each</span>
                      </div>
                    </div>
                  </div>
                  {/* Second row: details */}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {overrideMode ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={overridePcts[pos] ?? split.pct}
                          onChange={(e) =>
                            setOverridePcts((prev) => ({
                              ...prev,
                              [pos]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right"
                        />
                        <span>%</span>
                      </div>
                    ) : (
                      <span>{split.pct.toFixed(1)}%</span>
                    )}
                    <span>·</span>
                    <span>{fmt(split.pool)} pool</span>
                    {split.weight && !overrideMode && (
                      <>
                        <span>·</span>
                        <span>{split.weight}x wt</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {overrideMode && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <div
                  className={`text-xs font-medium ${
                    Math.abs(overridePctTotal - 100) < 0.1
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}
                >
                  Total: {overridePctTotal.toFixed(1)}%{" "}
                  {Math.abs(overridePctTotal - 100) >= 0.1 && "(must equal 100%)"}
                </div>
              </div>
            )}
          </div>}

          {/* Google Reviews & High Performer (admin editable) */}
          {isAdmin ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Google Reviews */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Star size={14} className="text-amber-500" />
                  {t("bonusPool.googleReviews")}
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      Confirmed reviews
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={reviewCount}
                      onChange={(e) =>
                        setReviewCount(parseInt(e.target.value) || 0)
                      }
                      className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-500">Bonus</div>
                    <div className="text-lg font-semibold text-amber-600">
                      {fmt(
                        reviewCount * (data?.googleReviewBonusEach || 50)
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      @ {fmt(data?.googleReviewBonusEach || 50)} each
                    </div>
                  </div>
                </div>
                {/* Tracked surveys */}
                {trackedReviews.length > 0 && (
                  <div className="border-t border-slate-100 pt-2">
                    <button
                      onClick={() => setShowReviewDetails(!showReviewDetails)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {showReviewDetails ? "Hide" : "Show"} survey tracking ({trackedReviews.length} sent,{" "}
                      {trackedReviews.filter((r) => r.rating && r.rating >= 4).length} high ratings,{" "}
                      {trackedReviews.filter((r) => r.reviewConfirmed).length} confirmed)
                    </button>
                    {showReviewDetails && (
                      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                        {trackedReviews.map((rr) => (
                          <div key={rr.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate text-slate-600">
                                {rr.project?.name || rr.clientName}
                              </span>
                              {rr.rating && (
                                <span className="flex-shrink-0">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} size={8} className={`inline ${i < rr.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200"}`} />
                                  ))}
                                </span>
                              )}
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              {rr.reviewConfirmed ? (
                                <span className="text-emerald-600 font-medium flex items-center gap-1">
                                  <CheckCircle2 size={10} /> Confirmed
                                </span>
                              ) : rr.rating && rr.rating >= 4 ? (
                                <button
                                  onClick={async () => {
                                    await fetch(`/api/review-requests/${rr.id}/confirm`, { method: "POST" });
                                    setReviewCount((c) => c + 1);
                                    fetchPool();
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Confirm Review
                                </button>
                              ) : rr.rating ? (
                                <span className="text-slate-400">Low rating</span>
                              ) : (
                                <span className="text-slate-400">Awaiting</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* High Performer */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Award size={14} className="text-purple-500" />
                  {t("bonusPool.highPerformerNomination")}
                </h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      Employee
                    </label>
                    <select
                      value={hpWorkerId}
                      onChange={(e) => setHpWorkerId(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">— None —</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.position})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      Bonus Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={hpAmount}
                      onChange={(e) => setHpAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Non-admin view of google reviews & HP */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {(data?.googleReviewCount || 0) > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Star size={14} className="text-amber-500" />
                    {t("bonusPool.googleReviews")}
                  </h3>
                  <div className="text-lg font-semibold text-amber-600">
                    {data.googleReviewCount} reviews ={" "}
                    {fmt(data.googleReviewTotal)}
                  </div>
                </div>
              )}
              {data?.highPerformerName && (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Award size={14} className="text-purple-500" />
                    {t("bonusPool.highPerformer")}
                  </h3>
                  <div className="text-sm text-slate-800">
                    {data.highPerformerName} —{" "}
                    <span className="font-semibold text-purple-600">
                      {fmt(data.highPerformerAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes (admin) */}
          {isAdmin && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this month's bonus pool..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-20 resize-none"
              />
            </div>
          )}

          {/* Project breakdowns (admin only) */}
          {isAdmin && data?.projectBreakdowns?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl mb-6">
              <div className="px-4 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Info size={14} className="text-slate-400" />
                  Project Details
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {data.projectBreakdowns.map((p: any) => (
                  <div key={p.projectId} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-slate-800 truncate mr-2">
                        {p.projectName}
                      </div>
                      <div className="text-sm font-semibold text-emerald-600 flex-shrink-0">
                        {fmt(p.bonus)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{p.estimatedHours.toFixed(1)} est</span>
                      <span>·</span>
                      <span>{p.actualHours.toFixed(1)} actual</span>
                      <span>·</span>
                      <span className={p.hoursSaved > 0 ? "text-emerald-600 font-medium" : ""}>
                        {p.hoursSaved.toFixed(1)} saved
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data?.completedProjectCount === 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center mb-6">
              <AlertTriangle size={24} className="text-slate-300 mx-auto mb-2" />
              <div className="text-sm text-slate-500">
                No completed projects this month yet.
              </div>
              <div className="text-xs text-slate-400 mt-1">
                The bonus pool builds as projects are completed under their estimated hours.
              </div>
            </div>
          )}

          {/* Save / Finalize buttons (admin only) */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {saving ? "Saving..." : "Save Draft"}
              </button>
              {data?.status !== "finalized" && (
                <button
                  onClick={handleFinalize}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 size={14} />
                  Finalize Month
                </button>
              )}
              {saved && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 size={14} /> Saved!
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Config Modal ─── */}
      {showConfig && configData && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowConfig(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Settings size={16} className="text-indigo-500" />
                Bonus Pool Configuration
              </h3>
              <button
                onClick={() => setShowConfig(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Rate per hour */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Rate Per Hour Saved ($)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={configData.ratePerHour}
                  onChange={(e) =>
                    setConfigData({
                      ...configData,
                      ratePerHour: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Google review bonus */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Google Review Bonus ($ each)
                </label>
                <input
                  type="number"
                  step="5"
                  value={configData.googleReviewBonusEach}
                  onChange={(e) =>
                    setConfigData({
                      ...configData,
                      googleReviewBonusEach: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Position weights */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Position Weights (for auto-split calculation)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Higher weight = larger share per person. A PM at 2.0x gets
                  twice the per-person amount of a Technician at 1.0x.
                </p>
                <div className="space-y-2">
                  {Object.entries(
                    configData.positionWeights || {}
                  ).map(([pos, weight]) => (
                    <div key={pos} className="flex items-center gap-3">
                      <span className="text-sm text-slate-700 w-40">
                        {pos}
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={weight as number}
                        onChange={(e) => {
                          const w = {
                            ...configData.positionWeights,
                            [pos]: parseFloat(e.target.value) || 1,
                          };
                          setConfigData({ ...configData, positionWeights: w });
                        }}
                        className="w-20 border border-slate-300 rounded px-2 py-1.5 text-sm text-right"
                      />
                      <span className="text-xs text-slate-400">×</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Excluded positions */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Excluded Positions (commission-based)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  These positions have their own incentive plans and are excluded from the bonus pool.
                </p>
                <div className="space-y-1.5">
                  {(configData.excludedPositions || []).map((pos: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pos}
                        onChange={(e) => {
                          const updated = [...(configData.excludedPositions || [])];
                          updated[i] = e.target.value;
                          setConfigData({ ...configData, excludedPositions: updated });
                        }}
                        className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => {
                          const updated = (configData.excludedPositions || []).filter((_: string, j: number) => j !== i);
                          setConfigData({ ...configData, excludedPositions: updated });
                        }}
                        className="text-red-400 hover:text-red-600 text-xs px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setConfigData({
                        ...configData,
                        excludedPositions: [...(configData.excludedPositions || []), ""],
                      })
                    }
                    className="text-xs text-indigo-600 hover:underline mt-1"
                  >
                    + Add position
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                disabled={configSaving}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {configSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save Config
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
