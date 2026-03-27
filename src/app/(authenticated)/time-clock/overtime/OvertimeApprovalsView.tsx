"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, AlertTriangle,
  User, Briefcase, Calendar,
} from "lucide-react";

type OvertimeEntry = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  overtime: boolean;
  approvalStatus: string;
  flagReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  worker: { id: string; name: string; position: string | null } | null;
  project: { id: string; name: string; number: string | null } | null;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function calcHours(clockIn: string, clockOut: string | null): number {
  if (!clockOut) return 0;
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

export default function OvertimeApprovalsView() {
  const router = useRouter();
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"flagged" | "approved" | "denied" | "all">("flagged");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/time-clock/overtime-approvals?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAction = async (entryId: string, action: "approve" | "deny") => {
    setProcessing(entryId);
    try {
      const res = await fetch("/api/time-clock/overtime-approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, action }),
      });
      if (res.ok) {
        if (filter === "flagged") {
          setEntries((prev) => prev.filter((e) => e.id !== entryId));
        } else {
          fetchEntries();
        }
      }
    } catch {
      // silent
    }
    setProcessing(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "flagged":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
            <AlertTriangle className="w-3 h-3" /> Needs Approval
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case "denied":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" /> Denied
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/time-clock/payroll"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Overtime Approvals
          </h1>
          <p className="text-sm text-slate-500">
            Review and approve overtime time entries
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(["flagged", "approved", "denied", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f === "flagged" ? "Needs Approval" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">
              {filter === "flagged" ? "No overtime entries need approval" : "No entries found"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === "flagged" ? "All caught up!" : "Try a different filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const hours = calcHours(entry.clockIn, entry.clockOut);
              const isProcessing = processing === entry.id;

              return (
                <div
                  key={entry.id}
                  className="p-4 hover:bg-slate-50/50 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold text-slate-800 text-sm">
                          {entry.worker?.name || "Unknown Worker"}
                        </span>
                        {statusBadge(entry.approvalStatus)}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {entry.project?.name || "No project"}
                          {entry.project?.number && (
                            <span className="text-slate-400">#{entry.project.number}</span>
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(entry.clockIn)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(entry.clockIn)}
                          {entry.clockOut && ` — ${formatTime(entry.clockOut)}`}
                        </span>
                        <span className="font-semibold text-amber-700">
                          {hours}h worked
                        </span>
                      </div>

                      {entry.flagReason && (
                        <p className="mt-1.5 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 inline-block">
                          {entry.flagReason}
                        </p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    {entry.approvalStatus === "flagged" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAction(entry.id, "approve")}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(entry.id, "deny")}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white text-red-600 border border-red-200 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Deny
                        </button>
                      </div>
                    )}

                    {entry.approvalStatus !== "flagged" && entry.approvedAt && (
                      <div className="text-xs text-slate-400 text-right shrink-0">
                        {new Date(entry.approvedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
