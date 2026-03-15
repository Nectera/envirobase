"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Trash2,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

interface MetricsViewProps {
  metrics: any[];
  partners?: string[];
  currentYear: number;
}

type TabType = "Leads" | "History";

export default function MetricsView({ metrics, currentYear }: MetricsViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("Leads");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);

  // CRM lead counts (auto-populated)
  const [crmLeadData, setCrmLeadData] = useState<{
    weeks: any[];
    totals: { greeley: number; grandJunction: number; total: number; referredOut: number };
  } | null>(null);

  useEffect(() => {
    fetch(`/api/metrics/lead-counts?year=${selectedYear}`)
      .then((res) => res.json())
      .then((data) => setCrmLeadData(data))
      .catch((err) => logger.error("Failed to fetch CRM lead counts:", { error: String(err) }));
  }, [selectedYear]);

  const filteredMetrics = useMemo(
    () => metrics.filter((m) => new Date(m.weekStartDate).getFullYear() === selectedYear),
    [metrics, selectedYear]
  );

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const handleDeleteMetric = async (id: string) => {
    if (!confirm("Are you sure you want to delete this metric entry?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/metrics/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete metric");
      router.refresh();
    } catch (error) {
      logger.error("Error deleting metric:", { error: String(error) });
      alert("Failed to delete metric");
    } finally {
      setLoading(false);
    }
  };



  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);

  const tabs: { key: TabType; label: string }[] = [
    { key: "Leads", label: t("metrics.leads") },
    { key: "History", label: t("metrics.history") },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{t("metrics.title")}</h1>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
            className="px-4 py-2 border border-slate-100 shadow-sm rounded-full text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7BC143] bg-white"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[#7BC143] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          {/* Leads Tab — Auto-populated from CRM */}
          {activeTab === "Leads" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">{t("metrics.leadsOverview")}</h2>
                <span className="text-xs text-slate-500 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                  {t("metrics.autoPopulated")}
                </span>
              </div>

              {!crmLeadData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                  <span className="ml-2 text-slate-500">{t("metrics.loadingLeads")}</span>
                </div>
              ) : (
                <>
                  {/* Stat Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-[#e8f5d9] border border-[#d0e8b8] rounded-full">
                      <p className="text-xs font-medium text-[#7BC143] uppercase">{t("metrics.greeleyYTD")}</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{crmLeadData.totals.greeley}</p>
                    </div>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-full">
                      <p className="text-xs font-medium text-purple-600 uppercase">{t("metrics.gjYTD")}</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">{crmLeadData.totals.grandJunction}</p>
                    </div>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-full">
                      <p className="text-xs font-medium text-green-600 uppercase">{t("metrics.totalLeadsYTD")}</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">{crmLeadData.totals.total}</p>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-full">
                      <p className="text-xs font-medium text-amber-600 uppercase">{t("metrics.referredOutYTD")}</p>
                      <p className="text-2xl font-bold text-amber-900 mt-1">{crmLeadData.totals.referredOut}</p>
                    </div>
                  </div>

                  {/* Weekly Leads Table */}
                  <div className="overflow-x-auto mb-8">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">{t("metrics.weekStart")}</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-900">{t("metrics.greeley")}</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-900">{t("metrics.grandJunction")}</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-900">{t("common.total")}</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-900">{t("metrics.referredOut")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...crmLeadData.weeks].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate)).map((w) => (
                          <tr key={w.weekStartDate} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-900">
                              {new Date(w.weekStartDate + "T12:00:00").toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">{w.greeley}</td>
                            <td className="px-4 py-3 text-right text-slate-900">{w.grandJunction}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-semibold">
                              {w.greeley + w.grandJunction}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">{w.referredOut}</td>
                          </tr>
                        ))}
                        {crmLeadData.weeks.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                              {t("metrics.noLeadsForYear")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Top Sources Breakdown */}
                  {crmLeadData.weeks.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {/* Greeley Sources */}
                      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">{t("metrics.greeleyTopSources")}</h3>
                        <div className="space-y-2">
                          {(() => {
                            const sources: Record<string, number> = {};
                            crmLeadData.weeks.forEach((w) => {
                              Object.entries(w.greeleyBySource || {}).forEach(([src, count]) => {
                                sources[src] = (sources[src] || 0) + (count as number);
                              });
                            });
                            return Object.entries(sources)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 10)
                              .map(([src, count]) => (
                                <div key={src} className="flex items-center justify-between text-sm">
                                  <span className="text-slate-700 truncate mr-2">{src}</span>
                                  <span className="font-semibold text-[#7BC143]">{count}</span>
                                </div>
                              ));
                          })()}
                        </div>
                      </div>
                      {/* GJ Sources */}
                      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">{t("metrics.gjTopSources")}</h3>
                        <div className="space-y-2">
                          {(() => {
                            const sources: Record<string, number> = {};
                            crmLeadData.weeks.forEach((w) => {
                              Object.entries(w.gjBySource || {}).forEach(([src, count]) => {
                                sources[src] = (sources[src] || 0) + (count as number);
                              });
                            });
                            const entries = Object.entries(sources).sort(([, a], [, b]) => b - a).slice(0, 10);
                            return entries.length > 0 ? entries.map(([src, count]) => (
                              <div key={src} className="flex items-center justify-between text-sm">
                                <span className="text-slate-700 truncate mr-2">{src}</span>
                                <span className="font-semibold text-purple-600">{count}</span>
                              </div>
                            )) : (
                              <p className="text-sm text-slate-400">{t("metrics.noGJLeads")}</p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Leads Trends Chart */}
                  {crmLeadData.weeks.length > 1 && (
                    <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4">{t("metrics.leadsByOffice")}</h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={[...crmLeadData.weeks].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)).map((w) => ({
                          week: new Date(w.weekStartDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                          Greeley: w.greeley,
                          "Grand Junction": w.grandJunction,
                          "Referred Out": w.referredOut,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Greeley" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Grand Junction" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Referred Out" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "History" && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">{t("metrics.gmapsHistory")}</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">{t("metrics.week")}</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900">{t("metrics.reviews")}</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900">{t("metrics.photos")}</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900">{t("metrics.googleLeads")}</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-900">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMetrics
                      .sort(
                        (a, b) =>
                          new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
                      )
                      .map((m) => {
                        const reviewsTotal = (m.googleReviews?.greeley || 0) + (m.googleReviews?.denver || 0) + (m.googleReviews?.grandJunction || 0);
                        const googleLeadsTotal = (m.googleLeads?.greeley || 0) + (m.googleLeads?.denver || 0) + (m.googleLeads?.grandJunction || 0);
                        return (
                          <tr key={m.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-900">
                              {new Date(m.weekStartDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">{reviewsTotal}</td>
                            <td className="px-4 py-3 text-right text-slate-900">{m.googlePhotosAdded || 0}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-semibold">{googleLeadsTotal}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteMetric(m.id)}
                                disabled={loading}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:text-slate-400"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
