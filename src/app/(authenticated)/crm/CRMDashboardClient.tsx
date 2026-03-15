"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TrendingUp, DollarSign, CheckCircle, BarChart3, Calendar, Clock, CreditCard, Target } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

type TimePeriod = "month" | "quarter" | "ytd";

type Lead = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  status: string;
  estimatedValue: number | null;
  createdAt: string;
  projectType: string;
  address?: string | null;
  wonDate?: string | null;
  pipelineStage?: string | null;
  projectId?: string | null;
  updatedAt?: string;
  lostDate?: string | null;
  company?: { name: string } | null;
  contact?: { name: string } | null;
};

type Estimate = {
  id: string;
  estimateNumber: string;
  status: string;
  total: number;
  createdAt: string;
  acceptedDate?: string | null;
  company?: { name: string } | null;
};

type Invoice = {
  id: string;
  status: string;
  issueDate?: string | null;
  sentDate?: string | null;
  paidDate?: string | null;
  createdAt: string;
  total?: number;
  leadId?: string | null;
  projectId?: string | null;
  splitType?: string | null;
  internalCost?: number | null;
};

type ConsultationEstimate = {
  id: string;
  leadId?: string | null;
  status: string;
  customerPrice: number;
  totalCost: number;
  customerName?: string | null;
  address?: string | null;
  city?: string | null;
  createdAt: string;
};

const TYPE_BADGE: Record<string, string> = {
  ASBESTOS: "bg-indigo-100 text-indigo-700",
  LEAD: "bg-amber-100 text-amber-700",
  METH: "bg-red-100 text-red-700",
  MOLD: "bg-teal-100 text-teal-700",
  SELECT_DEMO: "bg-orange-100 text-orange-700",
  REBUILD: "bg-violet-100 text-violet-700",
  SELECT_DEMO_REBUILD: "bg-orange-100 text-orange-700",
};

const STAGE_COLORS: Record<string, string> = {
  new: "bg-slate-200",
  contacted: "bg-blue-400",
  site_visit: "bg-amber-400",
  proposal_sent: "bg-purple-400",
  negotiation: "bg-indigo-400",
  won: "bg-emerald-500",
  lost: "bg-red-400",
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type ServerNow = { year: number; month: number; day: number };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getPeriodStart(period: TimePeriod, sn: ServerNow): Date {
  switch (period) {
    case "month":
      return new Date(sn.year, sn.month, 1);
    case "quarter": {
      const quarterMonth = Math.floor(sn.month / 3) * 3;
      return new Date(sn.year, quarterMonth, 1);
    }
    case "ytd":
      return new Date(sn.year, 0, 1);
  }
}

function getPeriodLabel(period: TimePeriod, sn: ServerNow): string {
  switch (period) {
    case "month":
      return `${MONTH_NAMES[sn.month]} ${sn.year}`;
    case "quarter": {
      const q = Math.floor(sn.month / 3) + 1;
      return `Q${q} ${sn.year}`;
    }
    case "ytd":
      return `YTD ${sn.year}`;
  }
}

export default function CRMDashboardClient({
  leads,
  estimates,
  invoices,
  consultationEstimates,
  serverNow,
}: {
  leads: Lead[];
  estimates: Estimate[];
  invoices: Invoice[];
  consultationEstimates: ConsultationEstimate[];
  serverNow: ServerNow;
}) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<TimePeriod>("month");

  const periodStart = useMemo(() => getPeriodStart(period, serverNow), [period, serverNow]);

  // Filter leads created within the selected period
  const periodLeads = useMemo(
    () => leads.filter((l) => new Date(l.createdAt) >= periodStart),
    [leads, periodStart]
  );

  // KPIs for the period
  const totalLeads = periodLeads.length;

  const openLeads = periodLeads.filter((l) => l.status !== "won" && l.status !== "lost");
  // openPipelineValue removed — dollar amounts moved to opportunity pipeline

  const wonLeadsInPeriod = periodLeads.filter((l) => l.status === "won");
  const wonValue = wonLeadsInPeriod.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

  const conversionRate = totalLeads > 0
    ? Math.round((wonLeadsInPeriod.length / totalLeads) * 100)
    : 0;

  // Pipeline by stage (all leads, not period-filtered — pipeline is current state)
  const allOpenLeads = leads.filter((l) => l.status !== "won" && l.status !== "lost");
  // stageBreakdown & stageSummary removed — replaced by Opportunity Pipeline (estimate-based)

  // Lead pipeline stage counts for visual bar chart
  const pipelineStages = ["new", "contacted", "site_visit", "proposal_sent", "negotiation"];
  const LEAD_STAGE_COLORS: Record<string, string> = {
    new: "bg-blue-500",
    contacted: "bg-cyan-500",
    site_visit: "bg-violet-500",
    proposal_sent: "bg-amber-500",
    negotiation: "bg-orange-500",
  };
  const LEAD_STAGE_LABELS: Record<string, string> = {
    new: t("crm.new"),
    contacted: t("crm.contacted"),
    site_visit: t("crm.siteVisit"),
    proposal_sent: t("crm.proposalSent"),
    negotiation: t("crm.negotiation"),
  };
  const stageCounts = pipelineStages.map((s) => ({
    stage: s,
    count: allOpenLeads.filter((l) => l.status === s).length,
  }));
  const maxStageCount = Math.max(...stageCounts.map((s) => s.count), 1);

  // All-time stats
  const allWonLeads = leads.filter((l) => l.status === "won");
  // Exclude old imported leads: only count leads marked lost in the last 5 days
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const lostLeads = leads.filter(
    (l) => l.status === "lost" && l.createdAt && new Date(l.createdAt) >= fiveDaysAgo
  );
  const pendingEstimates = consultationEstimates.filter((ce) => ce.status === "draft" || ce.status === "costed");
  const recentLeads = leads.slice(0, 5);

  // Lifecycle duration: Lead intake → Won (using wonDate or estimate acceptedDate)
  const leadLifecycleDays = useMemo(() => {
    const wonWithDates = allWonLeads.filter((l) => l.wonDate);
    if (wonWithDates.length === 0) return null;
    const totalDays = wonWithDates.reduce((sum, l) => {
      const created = new Date(l.createdAt).getTime();
      const won = new Date(l.wonDate!).getTime();
      return sum + (won - created) / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(totalDays / wonWithDates.length);
  }, [allWonLeads]);

  // Lifecycle duration: Invoice → Paid
  const invoiceToPaidDays = useMemo(() => {
    const paidInvoices = invoices.filter((inv) => inv.status === "paid" && inv.paidDate);
    if (paidInvoices.length === 0) return null;
    const totalDays = paidInvoices.reduce((sum, inv) => {
      const start = new Date(inv.sentDate || inv.issueDate || inv.createdAt).getTime();
      const paid = new Date(inv.paidDate!).getTime();
      return sum + (paid - start) / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(totalDays / paidInvoices.length);
  }, [invoices]);

  // KPI label based on period
  const wonLabel = period === "month" ? t("crm.wonThisMonth") : period === "quarter" ? t("crm.wonThisQuarter") : t("crm.wonYTD");

  const periods: { value: TimePeriod; label: string }[] = [
    { value: "month", label: t("crm.monthly") },
    { value: "quarter", label: t("crm.quarterly") },
    { value: "ytd", label: t("crm.ytd") },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("crm.title")}</h1>
          <p className="text-sm text-slate-500">{t("crm.subtitle")}</p>
        </div>

        {/* Period filter pills */}
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full p-1 border border-slate-100 shadow-sm">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                period === p.value
                  ? "bg-[#7BC143] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period indicator */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={14} className="text-[#7BC143]" />
        <span className="text-xs font-medium text-slate-500">
          {t("crm.showing")}: <span className="text-slate-700">{getPeriodLabel(period, serverNow)}</span>
          {" "}—{" "}
          <span className="text-slate-400">
            {periodLeads.length} {periodLeads.length !== 1 ? t("crm.leadsInPeriod") : t("crm.leadInPeriod")}
          </span>
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">{t("crm.totalLeads")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalLeads}</p>
            </div>
            <TrendingUp className="text-[#7BC143]" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">{t("crm.openPipeline")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {openLeads.length} {t("crm.leads")}
              </p>
            </div>
            <Target className="text-emerald-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">{wonLabel}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {wonLeadsInPeriod.length} {t("crm.leads")}
              </p>
            </div>
            <CheckCircle className="text-emerald-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">{t("crm.conversionRate")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{conversionRate}%</p>
            </div>
            <BarChart3 className="text-blue-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">{t("crm.leadWonAvg")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {leadLifecycleDays !== null ? `${leadLifecycleDays}d` : "—"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {leadLifecycleDays !== null
                  ? `${allWonLeads.filter((l) => l.wonDate).length} ${t("crm.wonLeadsCount")}`
                  : t("crm.noDataYet")}
              </p>
            </div>
            <Clock className="text-amber-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">{t("crm.invoicePaidAvg")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {invoiceToPaidDays !== null ? `${invoiceToPaidDays}d` : "—"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {invoiceToPaidDays !== null
                  ? `${invoices.filter((i) => i.status === "paid" && i.paidDate).length} ${t("crm.paidInvoices")}`
                  : t("crm.noDataYet")}
              </p>
            </div>
            <CreditCard className="text-indigo-500" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Opportunity Pipeline Summary — mirrors /pipeline page stages */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">{t("crm.opportunityPipeline")}</h2>
            <Link href="/pipeline" className="text-xs text-indigo-600 hover:underline">{t("crm.viewFullPipeline")}</Link>
          </div>
          {(() => {
            const oppStages = [
              { key: "estimating", label: t("crm.estimating"), color: "bg-amber-500" },
              { key: "scheduled", label: t("crm.scheduled"), color: "bg-blue-500" },
              { key: "invoiced", label: t("crm.invoiced"), color: "bg-purple-500" },
              { key: "paid", label: t("crm.paid"), color: "bg-emerald-500" },
            ];

            // Derive opportunities from won leads (same logic as pipeline/page.tsx)
            const wonLeads = leads.filter((l) => l.status === "won");
            const opportunities = wonLeads.map((lead) => {
              const ce = consultationEstimates.find((e) => e.leadId === lead.id) || null;

              // Find non-void invoices for this lead
              const leadInvoices = invoices.filter(
                (i) =>
                  i.status !== "void" &&
                  (i.leadId === lead.id || (lead.projectId && i.projectId === lead.projectId))
              );
              const finalInvoice = leadInvoices.find((i) => i.splitType !== "deposit") || null;
              const invoice = finalInvoice || leadInvoices[0] || null;

              // Derive stage
              let stage: string;
              if (lead.pipelineStage) {
                stage = lead.pipelineStage;
              } else if (finalInvoice && finalInvoice.status === "paid") {
                stage = "paid";
              } else if (finalInvoice && (finalInvoice.status === "sent" || finalInvoice.status === "overdue")) {
                stage = "invoiced";
              } else if (
                ce &&
                (ce.status === "converted" || ce.status === "approved" || ce.status === "accepted" || (invoice && invoice.status === "draft"))
              ) {
                stage = "scheduled";
              } else {
                stage = "estimating";
              }

              // Derive value
              let value = 0;
              if (invoice) {
                value = invoice.total || 0;
              } else if (ce) {
                value = ce.customerPrice || ce.totalCost || 0;
              } else {
                value = lead.estimatedValue || 0;
              }

              return { stage, value };
            });

            const totalValue = opportunities.reduce((sum, o) => sum + o.value, 0);

            return (
              <div className="space-y-4">
                {oppStages.map((stage) => {
                  const stageOpps = opportunities.filter((o) => o.stage === stage.key);
                  const stageValue = stageOpps.reduce((sum, o) => sum + o.value, 0);
                  const pct = totalValue > 0 ? Math.round((stageValue / totalValue) * 100) : 0;
                  return (
                    <div key={stage.key}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{stage.label}</p>
                          <p className="text-xs text-slate-500">
                            {stageOpps.length} {stageOpps.length !== 1 ? t("crm.opportunities") : t("crm.opportunity")} &middot; {formatCurrency(stageValue)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-600">{pct}%</p>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${stage.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-slate-100 flex gap-6 text-xs text-slate-500">
                  <span><strong className="text-slate-700">{opportunities.length}</strong> {t("crm.totalOpportunities")}</span>
                  <span><strong className="text-slate-700">{formatCurrency(totalValue)}</strong> {t("crm.totalValue")}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">{t("crm.quickActions")}</h2>
            <div className="space-y-2">
              <Link
                href="/leads/new"
                className="block w-full px-4 py-2 bg-[#7BC143] hover:bg-[#6aad38] text-white text-sm rounded-full font-medium text-center transition"
              >
                {t("crm.newLead")}
              </Link>
              <Link
                href="/estimates/consultation"
                className="block w-full px-4 py-2 border border-slate-200 text-slate-900 text-sm rounded-full font-medium hover:bg-slate-50 text-center transition"
              >
                {t("crm.newEstimate")}
              </Link>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">{t("crm.stats")}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">{t("crm.wonLeads")}</span>
                <span className="font-medium text-slate-900">{allWonLeads.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t("crm.lostLeads")}</span>
                <span className="font-medium text-slate-900">{lostLeads.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t("crm.activeEstimates")}</span>
                <span className="font-medium text-slate-900">{pendingEstimates.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Pipeline Visual */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-900">{t("crm.leadPipeline")}</h2>
          </div>
          <Link href="/pipeline" className="text-xs text-indigo-600 hover:underline">{t("crm.viewPipeline")}</Link>
        </div>
        <div className="p-6">
          <div className="space-y-2.5">
            {stageCounts.map((sc) => (
              <div key={sc.stage} className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500 w-20 truncate">{LEAD_STAGE_LABELS[sc.stage]}</span>
                <div className="flex-1 h-5 bg-slate-50 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full ${LEAD_STAGE_COLORS[sc.stage]} transition-all`}
                    style={{ width: `${(sc.count / maxStageCount) * 100}%`, minWidth: sc.count > 0 ? "18px" : "0" }}
                  />
                  {sc.count > 0 && (
                    <span className="absolute inset-y-0 flex items-center text-[10px] font-bold text-white px-2">{sc.count}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-emerald-600">{allWonLeads.length}</div>
              <div className="text-[10px] text-slate-400 uppercase">{t("crm.won")}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-violet-600">{allOpenLeads.length}</div>
              <div className="text-[10px] text-slate-400 uppercase">{t("crm.openPipeline")}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">{allOpenLeads.length}</div>
              <div className="text-[10px] text-slate-400 uppercase">{t("crm.openLeads")}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-900">{t("crm.topCustomers")}</h2>
          </div>
          <div className="p-6">
            {(() => {
              // Group leads by company name, count them
              const companyCounts: Record<string, number> = {};
              for (const l of leads) {
                const name = l.company?.name;
                if (name) {
                  companyCounts[name] = (companyCounts[name] || 0) + 1;
                }
              }
              const sorted = Object.entries(companyCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);

              if (sorted.length === 0) {
                return <p className="text-sm text-slate-400 text-center py-6">{t("crm.noCustomerData")}</p>;
              }

              const maxCount = sorted[0][1];
              return (
                <div className="space-y-3">
                  {sorted.map(([name, count], i) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 truncate">{name}</span>
                          <span className="text-xs font-bold text-indigo-600 flex-shrink-0 ml-2">{count} {t("crm.leads")}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-400 transition-all"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Pending Estimates */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{t("crm.pendingEstimates")}</h2>
            <Link href="/estimates" className="text-xs text-indigo-600 hover:underline">{t("common.viewAll")}</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingEstimates.length > 0 ? (
              pendingEstimates.slice(0, 8).map((ce) => (
                <Link
                  key={ce.id}
                  href={`/estimates/consultation/${ce.id}`}
                  className="px-6 py-3 hover:bg-slate-50 transition block"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {ce.customerName || t("crm.untitled")}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[ce.address, ce.city].filter(Boolean).join(", ") || t("crm.noAddress")}
                      </p>
                    </div>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                        ce.status === "draft"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {ce.status === "draft" ? t("common.draft") : t("crm.costed")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {ce.totalCost ? formatCurrency(ce.totalCost) : t("crm.notCosted")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(ce.createdAt)}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                {t("crm.noPendingEstimates")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
