"use client";

import { useState } from "react";
import {
  FileDown, FileSpreadsheet, Calendar, Users, Clock, ChevronDown, ChevronRight,
  DollarSign, ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type ProjectBreakdown = {
  projectId: string | null;
  projectName: string;
  hours: number;
  daysWorked: number;
};

type EntryDetail = {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  notes: string;
  projectName: string;
};

type WorkerData = {
  workerId: string;
  workerName: string;
  workerRole: string;
  totalHours: number;
  daysWorked: number;
  avgHoursPerDay: number;
  projectBreakdown: ProjectBreakdown[];
  entries: EntryDetail[];
};

type ReportData = {
  startDate: string;
  endDate: string;
  totalHours: number;
  totalWorkers: number;
  totalEntries: number;
  workers: WorkerData[];
  generatedAt: string;
};

function getPayPeriodDefaults() {
  // Default to current biweekly period (Mon–Sun ending last Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const endDate = new Date(now);
  endDate.setDate(now.getDate() - dayOfWeek - 1); // Last Saturday
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 13); // Two weeks back

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(startDate), end: fmt(endDate) };
}

export default function PayrollReportView() {
  const defaults = getPayPeriodDefaults();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedWorkers, setExpandedWorkers] = useState<Set<string>>(new Set());
  const [showEntries, setShowEntries] = useState<Set<string>>(new Set());

  async function generateReport() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/time-clock/payroll-report?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate report");
        return;
      }
      const data = await res.json();
      setReport(data);
      setExpandedWorkers(new Set());
      setShowEntries(new Set());
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    window.open(`/api/time-clock/payroll-report?startDate=${startDate}&endDate=${endDate}&format=csv`, "_blank");
  }

  function downloadPDF() {
    window.open(`/api/time-clock/payroll-report/pdf?startDate=${startDate}&endDate=${endDate}`, "_blank");
  }

  function toggleWorker(id: string) {
    setExpandedWorkers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleEntries(id: string) {
    setShowEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  function formatDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  function setQuickRange(type: "thisWeek" | "lastWeek" | "last2Weeks" | "thisMonth" | "lastMonth") {
    const now = new Date();
    const day = now.getDay();
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    if (type === "thisWeek") {
      const start = new Date(now);
      start.setDate(now.getDate() - day + 1); // Monday
      setStartDate(fmt(start));
      setEndDate(fmt(now));
    } else if (type === "lastWeek") {
      const end = new Date(now);
      end.setDate(now.getDate() - day); // Last Sunday
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      setStartDate(fmt(start));
      setEndDate(fmt(end));
    } else if (type === "last2Weeks") {
      const end = new Date(now);
      end.setDate(now.getDate() - day); // Last Sunday
      const start = new Date(end);
      start.setDate(end.getDate() - 13);
      setStartDate(fmt(start));
      setEndDate(fmt(end));
    } else if (type === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(fmt(start));
      setEndDate(fmt(now));
    } else if (type === "lastMonth") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(fmt(start));
      setEndDate(fmt(end));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/time-clock" className="p-2 hover:bg-slate-100 rounded-xl transition">
            <ArrowLeft size={18} className="text-slate-500" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <DollarSign size={20} className="text-[#7BC143]" />
              Payroll Report
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Generate time reports for payroll processing</p>
          </div>
        </div>
        {report && (
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCSV}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet size={14} /> Export CSV
            </button>
            <button
              onClick={downloadPDF}
              className="px-3 py-2 bg-[#7BC143] hover:bg-[#6aad38] text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
            >
              <FileDown size={14} /> Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 mb-1 block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143]"
            />
          </div>
          <button
            onClick={generateReport}
            disabled={loading || !startDate || !endDate}
            className="px-6 py-2 bg-[#7BC143] hover:bg-[#6aad38] disabled:bg-slate-300 text-white text-sm font-medium rounded-full transition flex items-center gap-2 whitespace-nowrap"
          >
            <Calendar size={16} /> {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>

        {/* Quick range buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { label: "This Week", value: "thisWeek" as const },
            { label: "Last Week", value: "lastWeek" as const },
            { label: "Last 2 Weeks", value: "last2Weeks" as const },
            { label: "This Month", value: "thisMonth" as const },
            { label: "Last Month", value: "lastMonth" as const },
          ].map((range) => (
            <button
              key={range.value}
              onClick={() => setQuickRange(range.value)}
              className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full transition"
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Report Results */}
      {report && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="text-xs text-slate-500 mb-1">Total Workers</div>
              <div className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-blue-500" />
                {report.totalWorkers}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="text-xs text-slate-500 mb-1">Total Hours</div>
              <div className="text-xl font-bold text-[#7BC143] flex items-center gap-2">
                <Clock size={18} />
                {report.totalHours.toFixed(1)}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="text-xs text-slate-500 mb-1">Time Entries</div>
              <div className="text-xl font-bold text-slate-900">{report.totalEntries}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="text-xs text-slate-500 mb-1">Avg Hours/Worker</div>
              <div className="text-xl font-bold text-slate-900">
                {report.totalWorkers > 0 ? (report.totalHours / report.totalWorkers).toFixed(1) : "0"}
              </div>
            </div>
          </div>

          {/* Worker Table — Desktop */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Employee Hours Summary</h2>
              <span className="text-xs text-slate-500">
                {formatDate(report.startDate)} — {formatDate(report.endDate)}
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs"></th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">Employee</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">Role</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs">Days</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs">Total Hours</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs">Avg/Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {report.workers.map((w) => (
                    <>
                      <tr
                        key={w.workerId}
                        onClick={() => toggleWorker(w.workerId)}
                        className="hover:bg-slate-50 cursor-pointer transition"
                      >
                        <td className="px-5 py-3 w-8">
                          {expandedWorkers.has(w.workerId) ? (
                            <ChevronDown size={14} className="text-slate-400" />
                          ) : (
                            <ChevronRight size={14} className="text-slate-400" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{w.workerName}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{w.workerRole}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{w.daysWorked}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{w.totalHours.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-right text-slate-500">{w.avgHoursPerDay.toFixed(1)}h</td>
                      </tr>

                      {/* Expanded project breakdown */}
                      {expandedWorkers.has(w.workerId) && (
                        <tr key={`${w.workerId}-details`}>
                          <td colSpan={6} className="bg-slate-50/50 px-5 py-3">
                            <div className="pl-8 space-y-2">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Project Breakdown
                              </div>
                              {w.projectBreakdown.map((pb) => (
                                <div key={pb.projectId || "office"} className="flex items-center justify-between text-sm">
                                  <span className="text-slate-700">{pb.projectName}</span>
                                  <div className="flex items-center gap-4 text-xs">
                                    <span className="text-slate-500">{pb.daysWorked} days</span>
                                    <span className="font-medium text-slate-800 w-16 text-right">{pb.hours.toFixed(1)}h</span>
                                    <span className="text-slate-400 w-12 text-right">
                                      {w.totalHours > 0 ? ((pb.hours / w.totalHours) * 100).toFixed(0) : 0}%
                                    </span>
                                  </div>
                                </div>
                              ))}

                              {/* Toggle detailed entries */}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleEntries(w.workerId); }}
                                className="text-xs text-[#7BC143] hover:text-[#6aad38] font-medium mt-2"
                              >
                                {showEntries.has(w.workerId) ? "Hide" : "Show"} detailed entries ({w.entries.length})
                              </button>

                              {showEntries.has(w.workerId) && (
                                <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead className="bg-slate-100">
                                      <tr>
                                        <th className="text-left px-3 py-1.5 font-medium text-slate-500">Date</th>
                                        <th className="text-left px-3 py-1.5 font-medium text-slate-500">Project</th>
                                        <th className="text-left px-3 py-1.5 font-medium text-slate-500">In</th>
                                        <th className="text-left px-3 py-1.5 font-medium text-slate-500">Out</th>
                                        <th className="text-right px-3 py-1.5 font-medium text-slate-500">Hours</th>
                                        <th className="text-left px-3 py-1.5 font-medium text-slate-500">Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {w.entries.map((e) => (
                                        <tr key={e.id} className="hover:bg-slate-50">
                                          <td className="px-3 py-1.5 text-slate-700">{formatDate(e.date)}</td>
                                          <td className="px-3 py-1.5 text-slate-600">{e.projectName}</td>
                                          <td className="px-3 py-1.5 text-slate-600">{formatTime(e.clockIn)}</td>
                                          <td className="px-3 py-1.5 text-slate-600">{formatTime(e.clockOut)}</td>
                                          <td className="px-3 py-1.5 text-right font-medium text-slate-800">{e.hours?.toFixed(1)}h</td>
                                          <td className="px-3 py-1.5 text-slate-500 max-w-[150px] truncate">{e.notes || "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td className="px-5 py-3" />
                    <td className="px-4 py-3 font-bold text-slate-900 text-sm">TOTAL</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-bold text-[#7BC143] text-sm">{report.totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile stacked layout */}
            <div className="sm:hidden divide-y divide-slate-100">
              {report.workers.map((w) => (
                <div key={w.workerId}>
                  <div
                    onClick={() => toggleWorker(w.workerId)}
                    className="px-4 py-3 flex items-center justify-between cursor-pointer active:bg-slate-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {expandedWorkers.has(w.workerId) ? (
                        <ChevronDown size={14} className="text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-slate-800 truncate">{w.workerName}</div>
                        <div className="text-[10px] text-slate-500">{w.workerRole} · {w.daysWorked} days</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="font-bold text-sm text-slate-900">{w.totalHours.toFixed(1)}h</div>
                      <div className="text-[10px] text-slate-500">{w.avgHoursPerDay.toFixed(1)}h/day</div>
                    </div>
                  </div>

                  {expandedWorkers.has(w.workerId) && (
                    <div className="px-4 pb-3 pl-10 space-y-1.5">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">Projects</div>
                      {w.projectBreakdown.map((pb) => (
                        <div key={pb.projectId || "office"} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">{pb.projectName}</span>
                          <span className="font-medium text-slate-800">{pb.hours.toFixed(1)}h</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Mobile total */}
              <div className="px-4 py-3 flex items-center justify-between bg-slate-50">
                <span className="font-bold text-sm text-slate-900">TOTAL</span>
                <span className="font-bold text-sm text-[#7BC143]">{report.totalHours.toFixed(1)}h</span>
              </div>
            </div>
          </div>

          {/* Export buttons on mobile */}
          <div className="sm:hidden flex gap-2">
            <button
              onClick={downloadCSV}
              className="flex-1 px-3 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2"
            >
              <FileSpreadsheet size={16} /> Export CSV
            </button>
            <button
              onClick={downloadPDF}
              className="flex-1 px-3 py-3 bg-[#7BC143] text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2"
            >
              <FileDown size={16} /> Export PDF
            </button>
          </div>
        </>
      )}

      {/* Empty state */}
      {!report && !loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <DollarSign size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No Report Generated</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Select a date range and click &quot;Generate Report&quot; to view payroll hours for your team.
          </p>
        </div>
      )}
    </div>
  );
}
