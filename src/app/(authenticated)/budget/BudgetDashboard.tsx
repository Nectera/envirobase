"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  Link2,
  X,
  Search,
} from "lucide-react";

type PerformanceRow = {
  id: string;
  date: string | null;
  project: string;
  projectNumber: string | null;
  type: string;
  status: string;
  hasPostCost: boolean;
  revenue: number;
  totalCost: number;
  netIncome: number;
  grossProfit: number;
  laborCost: number;
  opsCost: number;
  materialCost: number;
  cogsCost: number;
  estRevenue: number;
  estTotalCost: number;
  estNetIncome: number;
  estLaborCost: number;
  estOpsCost: number;
  estMaterialCost: number;
  estCogsCost: number;
  estimatedHours: number;
  hoursWorked: number;
  region: string;
  bonusEarned: number | null;
  supervisor: string | null;
  cashSwing: number;
  netMarginPct: number;
};

type PerformanceData = {
  year: number | "all";
  rows: PerformanceRow[];
  totals: {
    revenue: number;
    totalCost: number;
    netIncome: number;
    grossProfit: number;
    laborCost: number;
    opsCost: number;
    materialCost: number;
    cogsCost: number;
    hoursWorked: number;
    bonusEarned: number;
    cashSwing: number;
    estRevenue: number;
    estTotalCost: number;
  };
  percentages: {
    totalCostPct: number;
    netIncomePct: number;
    grossProfitPct: number;
    laborCostPct: number;
    opsCostPct: number;
    materialCostPct: number;
    cogsCostPct: number;
  };
  projectCount: number;
  postCostCount: number;
};

type SortKey = "date" | "project" | "revenue" | "totalCost" | "netIncome" | "grossProfit" | "laborCost" | "opsCost" | "materialCost" | "cogsCost" | "hoursWorked" | "region" | "bonusEarned" | "supervisor" | "cashSwing";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getMarginColor(pct: number): string {
  if (pct >= 0.15) return "bg-emerald-50/70";
  if (pct >= 0.12) return "bg-yellow-50/70";
  if (pct >= 0.10) return "bg-orange-50/70";
  return "bg-red-50/70";
}

function getMarginBorder(pct: number): string {
  if (pct >= 0.15) return "border-l-emerald-400";
  if (pct >= 0.12) return "border-l-yellow-400";
  if (pct >= 0.10) return "border-l-orange-400";
  return "border-l-red-400";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BudgetDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshData = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/project-performance?year=${year}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, refreshKey]);

  const regions = useMemo(() => {
    if (!data) return [];
    const s = new Set(data.rows.map((r) => r.region));
    return Array.from(s).sort();
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    let rows = data.rows;
    if (regionFilter !== "all") rows = rows.filter((r) => r.region === regionFilter);

    rows = [...rows].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "date": av = a.date || ""; bv = b.date || ""; break;
        case "project": av = a.project.toLowerCase(); bv = b.project.toLowerCase(); break;
        case "region": av = a.region; bv = b.region; break;
        case "supervisor": av = a.supervisor || ""; bv = b.supervisor || ""; break;
        default: av = (a as any)[sortKey] ?? 0; bv = (b as any)[sortKey] ?? 0; break;
      }
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
    return rows;
  }, [data, sortKey, sortAsc, regionFilter]);

  // Recalculate totals for filtered rows
  const filteredTotals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        acc.revenue += r.revenue;
        acc.totalCost += r.totalCost;
        acc.netIncome += r.netIncome;
        acc.grossProfit += r.grossProfit;
        acc.laborCost += r.laborCost;
        acc.opsCost += r.opsCost;
        acc.materialCost += r.materialCost;
        acc.cogsCost += r.cogsCost;
        acc.hoursWorked += r.hoursWorked;
        acc.bonusEarned += r.bonusEarned || 0;
        acc.cashSwing += r.cashSwing;
        return acc;
      },
      { revenue: 0, totalCost: 0, netIncome: 0, grossProfit: 0, laborCost: 0, opsCost: 0, materialCost: 0, cogsCost: 0, hoursWorked: 0, bonusEarned: 0, cashSwing: 0 }
    );
  }, [filteredRows]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleExportCsv = () => {
    if (!filteredRows.length) return;
    const headers = ["Date", "Project", "Revenue", "Total Cost", "Net Income", "Gross Profit", "Labor", "Operating Costs", "Material", "COGS", "Hours Worked", "Region", "Bonus Earned", "Supervisor", "Cash Swing From 15% Net"];
    const csvRows = filteredRows.map((r) => [
      r.date || "", r.project, r.revenue.toFixed(2), r.totalCost.toFixed(2), r.netIncome.toFixed(2),
      r.grossProfit.toFixed(2), r.laborCost.toFixed(2), r.opsCost.toFixed(2), r.materialCost.toFixed(2),
      r.cogsCost.toFixed(2), r.hoursWorked.toFixed(2), r.region, (r.bonusEarned || 0).toFixed(2),
      r.supervisor || "", r.cashSwing.toFixed(2),
    ].map((v) => `"${v}"`).join(","));
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Project_Performance_${year === "all" ? "All_Years" : year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!data || data.projectCount === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-900">Project Performance</h1>
          <YearSelector year={year} onChange={setYear} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-sm font-semibold text-slate-700 mb-2">No Performance Data{year !== "all" ? ` for ${year}` : ""}</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Complete projects with consultation estimates will appear here. Post-cost data shows actual figures; pre-cost data shows estimates.
          </p>
        </div>
      </div>
    );
  }

  const t = filteredTotals;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Project Performance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Revenue tracking and cost analysis across all projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLinkPanel(!showLinkPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showLinkPanel
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Link2 size={14} />
            Link Estimates
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
          <YearSelector year={year} onChange={setYear} />
        </div>
      </div>

      {/* Link Estimates Panel */}
      {showLinkPanel && (
        <LinkEstimatesPanel
          onLinked={() => { refreshData(); }}
          onClose={() => setShowLinkPanel(false)}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard
          icon={<DollarSign size={16} className="text-blue-600" />}
          iconBg="bg-blue-50"
          label="Revenue"
          value={formatCurrency(t.revenue)}
        />
        <SummaryCard
          icon={<TrendingDown size={16} className="text-amber-600" />}
          iconBg="bg-amber-50"
          label="Total Cost"
          value={formatCurrency(t.totalCost)}
          sub={t.revenue > 0 ? formatPct(t.totalCost / t.revenue) : undefined}
        />
        <SummaryCard
          icon={<TrendingUp size={16} className={t.netIncome >= 0 ? "text-emerald-600" : "text-red-600"} />}
          iconBg={t.netIncome >= 0 ? "bg-emerald-50" : "bg-red-50"}
          label="Net Income"
          value={formatCurrency(t.netIncome)}
          valueColor={t.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}
          sub={t.revenue > 0 ? formatPct(t.netIncome / t.revenue) : undefined}
        />
        <SummaryCard
          icon={<Clock size={16} className="text-indigo-600" />}
          iconBg="bg-indigo-50"
          label="Hours Worked"
          value={t.hoursWorked.toLocaleString()}
        />
        <SummaryCard
          icon={<Users size={16} className="text-purple-600" />}
          iconBg="bg-purple-50"
          label="Projects"
          value={String(filteredRows.length)}
          sub="post-costed"
        />
      </div>

      {/* Cost Breakdown Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-slate-700 mb-3">Cost Breakdown</h2>
        <div className="flex h-6 rounded-lg overflow-hidden">
          {[
            { label: "Labor", value: t.laborCost, color: "bg-indigo-400" },
            { label: "Operating", value: t.opsCost, color: "bg-amber-400" },
            { label: "Material", value: t.materialCost, color: "bg-emerald-400" },
            { label: "COGS", value: t.cogsCost, color: "bg-rose-400" },
          ].map((seg) => {
            const pct = t.totalCost > 0 ? (seg.value / t.totalCost) * 100 : 0;
            if (pct < 1) return null;
            return (
              <div
                key={seg.label}
                className={`${seg.color} relative group`}
                style={{ width: `${pct}%` }}
                title={`${seg.label}: ${formatCurrency(seg.value)} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {[
            { label: "Labor", value: t.laborCost, color: "bg-indigo-400" },
            { label: "Operating", value: t.opsCost, color: "bg-amber-400" },
            { label: "Material", value: t.materialCost, color: "bg-emerald-400" },
            { label: "COGS", value: t.cogsCost, color: "bg-rose-400" },
          ].map((seg) => (
            <span key={seg.label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className={`w-2.5 h-2.5 rounded-sm ${seg.color}`} />
              {seg.label}: {formatCurrency(seg.value)} ({t.totalCost > 0 ? ((seg.value / t.totalCost) * 100).toFixed(1) : 0}%)
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="all">All Regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {/* Color legend */}
        <div className="flex items-center gap-3 ml-2">
          <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-red-200" />&lt;10%</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-orange-200" />10-12%</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-200" />12-14%</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-200" />15%+</span>
        </div>
        <span className="text-[10px] text-slate-400 ml-2">
          {filteredRows.length} project{filteredRows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <SortHeader label="Date" sortKey="date" current={sortKey} asc={sortAsc} onClick={handleSort} className="sticky left-0 bg-slate-50 z-10" />
                <SortHeader label="Project" sortKey="project" current={sortKey} asc={sortAsc} onClick={handleSort} className="sticky left-[72px] bg-slate-50 z-10" />
                <SortHeader label="Revenue" sortKey="revenue" current={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                <SortHeader label="Total Cost" sortKey="totalCost" current={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                <SortHeader label="Net Income" sortKey="netIncome" current={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                <SortHeader label="Gross Profit" sortKey="grossProfit" current={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                <SortHeader label="Labor" sortKey="laborCost" current={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                <SortHeader label="Operating" sortKey="opsCost" current={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                <SortHeader label="Material" sortKey="materialCost" current={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                <SortHeader label="COGS" sortKey="cogsCost" current={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                <SortHeader label="Hours" sortKey="hoursWorked" current={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                <SortHeader label="Region" sortKey="region" current={sortKey} asc={sortAsc} onClick={handleSort} />
                <SortHeader label="Bonus" sortKey="bonusEarned" current={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                <SortHeader label="Supervisor" sortKey="supervisor" current={sortKey} asc={sortAsc} onClick={handleSort} />
                <SortHeader label="Cash Swing" sortKey="cashSwing" current={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {/* Totals Row */}
              <tr className="bg-slate-50/70 border-b border-slate-300 font-semibold">
                <td className="px-3 py-2 sticky left-0 bg-slate-50/70 z-10" colSpan={2}>
                  <span className="text-slate-600">Totals</span>
                </td>
                <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(t.revenue)}</td>
                <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(t.totalCost)}</td>
                <td className={`px-3 py-2 text-right ${t.netIncome >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(t.netIncome)}</td>
                <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(t.grossProfit)}</td>
                <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(t.laborCost)}</td>
                <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(t.opsCost)}</td>
                <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(t.materialCost)}</td>
                <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(t.cogsCost)}</td>
                <td className="px-3 py-2 text-right text-slate-900">{t.hoursWorked.toLocaleString()}</td>
                <td className="px-3 py-2 text-slate-400">—</td>
                <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(t.bonusEarned)}</td>
                <td className="px-3 py-2 text-slate-400">—</td>
                <td className={`px-3 py-2 text-right ${t.cashSwing >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(t.cashSwing)}</td>
              </tr>
              {/* Percentage Row */}
              {t.revenue > 0 && (
                <tr className="bg-slate-50/40 border-b border-slate-200 text-[10px] text-slate-400">
                  <td className="px-3 py-1 sticky left-0 bg-slate-50/40 z-10" colSpan={2}>% of Revenue</td>
                  <td className="px-3 py-1 text-right">—</td>
                  <td className="px-3 py-1 text-right">{formatPct(t.totalCost / t.revenue)}</td>
                  <td className="px-3 py-1 text-right">{formatPct(t.netIncome / t.revenue)}</td>
                  <td className="px-3 py-1 text-right">{formatPct(t.grossProfit / t.revenue)}</td>
                  <td className="px-3 py-1 text-right">{formatPct(t.laborCost / t.revenue)}</td>
                  <td className="px-3 py-1 text-right">{formatPct(t.opsCost / t.revenue)}</td>
                  <td className="px-3 py-1 text-right">{formatPct(t.materialCost / t.revenue)}</td>
                  <td className="px-3 py-1 text-right">{formatPct(t.cogsCost / t.revenue)}</td>
                  <td className="px-3 py-1" colSpan={5}>—</td>
                </tr>
              )}
              {/* Data Rows */}
              {filteredRows.map((row) => (
                <tr key={row.id} className={`border-b border-slate-100 border-l-4 ${getMarginColor(row.netMarginPct)} ${getMarginBorder(row.netMarginPct)} transition-colors`}>
                  <td className={`px-3 py-2.5 whitespace-nowrap sticky left-0 ${getMarginColor(row.netMarginPct)} z-10`}>
                    {formatDate(row.date)}
                  </td>
                  <td className={`px-3 py-2.5 sticky left-[72px] ${getMarginColor(row.netMarginPct)} z-10`}>
                    <Link href={`/projects/${row.id}`} className="text-green-700 hover:underline font-medium truncate block max-w-[180px]">
                      {row.project}
                    </Link>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-white/60 text-slate-600">
                        {formatPct(row.netMarginPct)} net
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatCurrency(row.revenue)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatCurrency(row.totalCost)}</td>
                  <td className={`px-3 py-2.5 text-right whitespace-nowrap ${row.netIncome >= 0 ? "text-slate-800" : "text-red-600"}`}>
                    {formatCurrency(row.netIncome)}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatCurrency(row.grossProfit)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatCurrency(row.laborCost)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatCurrency(row.opsCost)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatCurrency(row.materialCost)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatCurrency(row.cogsCost)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{row.hoursWorked || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{row.region}</td>
                  <td className={`px-3 py-2.5 text-right whitespace-nowrap ${(row.bonusEarned ?? 0) < 0 ? "text-red-600" : ""}`}>
                    {row.bonusEarned != null ? formatCurrency(row.bonusEarned) : "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 max-w-[120px] truncate">
                    {row.supervisor || "—"}
                  </td>
                  <td className={`px-3 py-2.5 text-right whitespace-nowrap ${row.cashSwing >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {formatCurrency(row.cashSwing)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRows.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-400">
            No projects match the current filters{year !== "all" ? ` for ${year}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function YearSelector({ year, onChange }: { year: number | "all"; onChange: (y: number | "all") => void }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1">
      <button
        onClick={() => onChange("all")}
        className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
          year === "all"
            ? "bg-indigo-100 text-indigo-700"
            : "text-slate-400 hover:text-slate-700"
        }`}
      >
        All
      </button>
      {year !== "all" && (
        <>
          <button onClick={() => onChange(year - 1)} className="p-1 text-slate-400 hover:text-slate-700">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-slate-800 w-10 text-center">{year}</span>
          <button onClick={() => onChange(year + 1)} className="p-1 text-slate-400 hover:text-slate-700">
            <ChevronRight size={14} />
          </button>
        </>
      )}
      {year === "all" && (
        <button
          onClick={() => onChange(new Date().getFullYear())}
          className="p-1 text-slate-400 hover:text-slate-700"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

function SummaryCard({
  icon, iconBg, label, value, sub, valueColor,
}: {
  icon: React.ReactNode; iconBg: string; label: string; value: string; sub?: string; valueColor?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${valueColor || "text-slate-900"}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SortHeader({
  label, sortKey, current, asc, onClick, align, className,
}: {
  label: string; sortKey: SortKey; current: SortKey; asc: boolean; onClick: (k: SortKey) => void; align?: "right"; className?: string;
}) {
  const active = current === sortKey;
  return (
    <th
      className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none whitespace-nowrap hover:text-slate-700 ${align === "right" ? "text-right" : "text-left"} ${className || ""}`}
      onClick={() => onClick(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active && (
          <ArrowUpDown size={10} className="text-green-600" />
        )}
      </span>
    </th>
  );
}

/* ─── Link Estimates Panel ───────────────────────────────────────── */

type UnlinkedEstimate = {
  id: string;
  customerName: string | null;
  address: string | null;
  customerPrice: number | null;
  projectNumber: string | null;
  createdAt: string;
  status: string;
};

type ProjectOption = {
  id: string;
  name: string;
  projectNumber: string | null;
  status: string;
  hasEstimate: boolean;
};

function LinkEstimatesPanel({ onLinked, onClose }: { onLinked: () => void; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [estimates, setEstimates] = useState<UnlinkedEstimate[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [searchProject, setSearchProject] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = () => {
    setLoading(true);
    fetch("/api/project-performance/link")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setEstimates(d.unlinkedEstimates || []);
          setProjects(d.projects || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filteredProjects = projects.filter((p) => {
    if (!searchProject) return true;
    const q = searchProject.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.projectNumber || "").toLowerCase().includes(q);
  });

  const handleLink = async () => {
    if (!selectedEstimate || !selectedProject) return;
    setLinking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/project-performance/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId: selectedEstimate, projectId: selectedProject }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Estimate linked successfully!", type: "success" });
        setSelectedEstimate(null);
        setSelectedProject(null);
        setSearchProject("");
        loadData();
        onLinked();
      } else {
        setMessage({ text: data.error || "Failed to link", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error", type: "error" });
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="animate-spin text-slate-400" size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-green-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-green-600" />
          <h2 className="text-sm font-semibold text-slate-900">Link Estimates to Projects</h2>
          {estimates.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              {estimates.length} unlinked
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>

      {message && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${
          message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {estimates.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">
          All consultation estimates are already linked to projects. If a project is still missing from the Performance page, make sure it has a status of &quot;in_progress&quot; or &quot;completed&quot;.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Select Estimate */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              1. Select an Unlinked Estimate
            </label>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
              {estimates.map((est) => (
                <button
                  key={est.id}
                  onClick={() => setSelectedEstimate(est.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                    selectedEstimate === est.id
                      ? "border-green-300 bg-green-50 ring-1 ring-green-200"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-medium text-slate-800">{est.customerName || "Unnamed Estimate"}</div>
                  <div className="text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    {est.address && <span>{est.address}</span>}
                    {est.customerPrice != null && (
                      <span className="font-medium text-slate-700">{formatCurrency(est.customerPrice)}</span>
                    )}
                    <span className="text-slate-400">{new Date(est.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Select Project */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              2. Link to Project
            </label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchProject}
                onChange={(e) => setSearchProject(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {filteredProjects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => setSelectedProject(proj.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                    selectedProject === proj.id
                      ? "border-green-300 bg-green-50 ring-1 ring-green-200"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{proj.name}</span>
                    {proj.projectNumber && (
                      <span className="text-slate-400">#{proj.projectNumber}</span>
                    )}
                  </div>
                  <div className="text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className="capitalize">{proj.status.replace("_", " ")}</span>
                    {proj.hasEstimate && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">Has estimate</span>
                    )}
                  </div>
                </button>
              ))}
              {filteredProjects.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No projects match your search</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Link Button */}
      {estimates.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleLink}
            disabled={!selectedEstimate || !selectedProject || linking}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {linking ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            Link Estimate to Project
          </button>
        </div>
      )}
    </div>
  );
}
