"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react";

type CategoryTotals = Record<string, { budget: number; actual: number }>;

type ProjectSummary = {
  id: string;
  name: string;
  projectNumber: string | null;
  type: string;
  status: string;
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercent: number;
  categoryTotals: CategoryTotals;
  lineCount: number;
};

type SummaryData = {
  projects: ProjectSummary[];
  grandBudget: number;
  grandActual: number;
  grandVariance: number;
  grandVariancePercent: number;
  globalCategories: CategoryTotals;
  overBudgetCount: number;
  underBudgetCount: number;
  totalProjects: number;
};

const CATEGORY_COLORS: Record<string, string> = {
  labor: "#6366f1",
  materials: "#f59e0b",
  equipment: "#10b981",
  subcontractor: "#8b5cf6",
  disposal: "#ef4444",
  permits: "#3b82f6",
  clearance: "#ec4899",
  other: "#64748b",
};

const CATEGORY_LABELS: Record<string, string> = {
  labor: "Labor",
  materials: "Materials",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  disposal: "Disposal",
  permits: "Permits",
  clearance: "Clearance",
  other: "Other",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function BarSegment({ budget, actual, maxValue }: { budget: number; actual: number; maxValue: number }) {
  const budgetWidth = maxValue > 0 ? (budget / maxValue) * 100 : 0;
  const actualWidth = maxValue > 0 ? (actual / maxValue) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-200 rounded-full"
          style={{ width: `${Math.min(budgetWidth, 100)}%` }}
        />
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${actual > budget ? "bg-red-400" : "bg-emerald-400"}`}
          style={{ width: `${Math.min(actualWidth, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function BudgetDashboard() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "over" | "under">("all");

  useEffect(() => {
    fetch("/api/project-budget/summary")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!data || data.totalProjects === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-lg font-bold text-slate-900 mb-4">Budget vs Actuals</h1>
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-sm font-semibold text-slate-700 mb-2">No Budget Data Yet</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Start adding budget lines to your projects to see budget vs actuals tracking here.
            You can add budgets from the project detail page or auto-populate from estimates.
          </p>
        </div>
      </div>
    );
  }

  const filteredProjects = data.projects.filter((p) => {
    if (filter === "over") return p.variance < 0;
    if (filter === "under") return p.variance >= 0;
    return true;
  });

  const maxProjectBudget = Math.max(
    ...data.projects.map((p) => Math.max(p.totalBudget, p.totalActual)),
    1
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-900">Budget vs Actuals</h1>
        <p className="text-xs text-slate-500 mt-1">
          Track project spending against budgets across all active projects
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <DollarSign size={16} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500">Total Budget</p>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(data.grandBudget)}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500">Total Actual</p>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(data.grandActual)}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              data.grandVariance >= 0 ? "bg-emerald-50" : "bg-red-50"
            }`}>
              {data.grandVariance >= 0 ? (
                <ArrowUpRight size={16} className="text-emerald-600" />
              ) : (
                <ArrowDownRight size={16} className="text-red-600" />
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">Variance</p>
          <p className={`text-lg font-bold ${data.grandVariance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(Math.abs(data.grandVariance))}
            <span className="text-xs font-normal ml-1">
              {data.grandVariance >= 0 ? "under" : "over"}
            </span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              data.overBudgetCount > 0 ? "bg-amber-50" : "bg-emerald-50"
            }`}>
              {data.overBudgetCount > 0 ? (
                <AlertTriangle size={16} className="text-amber-600" />
              ) : (
                <CheckCircle size={16} className="text-emerald-600" />
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">Projects</p>
          <p className="text-lg font-bold text-slate-900">
            {data.totalProjects}
            {data.overBudgetCount > 0 && (
              <span className="text-xs font-normal text-red-600 ml-1">
                ({data.overBudgetCount} over)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Spend by Category</h2>
        <div className="space-y-3">
          {Object.entries(data.globalCategories)
            .sort(([, a], [, b]) => b.budget - a.budget)
            .map(([category, totals]) => {
              const maxCat = Math.max(
                ...Object.values(data.globalCategories).map((t) => Math.max(t.budget, t.actual)),
                1
              );
              const variance = totals.budget - totals.actual;
              return (
                <div key={category} className="flex items-center gap-4">
                  <div className="w-24 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[category] || "#94a3b8" }}
                    />
                    <span className="text-xs font-medium text-slate-700 truncate">
                      {CATEGORY_LABELS[category] || category}
                    </span>
                  </div>
                  <div className="flex-1">
                    <BarSegment budget={totals.budget} actual={totals.actual} maxValue={maxCat} />
                  </div>
                  <div className="w-40 text-right text-xs">
                    <span className="text-slate-500">{formatCurrency(totals.actual)}</span>
                    <span className="text-slate-400"> / </span>
                    <span className="text-slate-700 font-medium">{formatCurrency(totals.budget)}</span>
                    <span className={`ml-2 ${variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      ({variance >= 0 ? "+" : ""}{formatCurrency(variance)})
                    </span>
                  </div>
                </div>
              );
            })}
          <div className="flex items-center gap-3 pt-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-blue-200 rounded" /> Budget</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-emerald-400 rounded" /> Actual (under)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-red-400 rounded" /> Actual (over)</span>
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Projects</h2>
          <div className="flex gap-1">
            {(["all", "over", "under"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  filter === f
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {f === "all" ? "All" : f === "over" ? "Over Budget" : "Under Budget"}
              </button>
            ))}
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No projects match this filter</p>
        ) : (
          <div className="space-y-2">
            {filteredProjects
              .sort((a, b) => a.variance - b.variance) // worst first
              .map((project) => {
                const pct = project.totalBudget > 0
                  ? (project.totalActual / project.totalBudget) * 100
                  : 0;
                const over = project.variance < 0;
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                  >
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"
                    }`} />

                    {/* Project info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 truncate">{project.name}</span>
                        {project.projectNumber && (
                          <span className="text-[10px] text-slate-400">#{project.projectNumber}</span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                          {project.type}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden w-full max-w-xs">
                        <div
                          className={`h-full rounded-full transition-all ${
                            over ? "bg-red-400" : pct > 80 ? "bg-amber-400" : "bg-emerald-400"
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Numbers */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-slate-500">
                        {formatCurrency(project.totalActual)} / {formatCurrency(project.totalBudget)}
                      </div>
                      <div className={`text-xs font-medium ${over ? "text-red-600" : "text-emerald-600"}`}>
                        {over ? (
                          <>{formatCurrency(Math.abs(project.variance))} over</>
                        ) : (
                          <>{formatCurrency(project.variance)} remaining</>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
