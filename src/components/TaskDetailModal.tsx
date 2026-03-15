"use client";

import { useState } from "react";
import { X, CheckCircle, Clock, AlertTriangle, User, Calendar, Flag, FileText, Loader2 } from "lucide-react";

interface TaskDetailModalProps {
  task: any;
  onClose: () => void;
  onComplete?: (taskId: string) => Promise<void>;
  onStatusChange?: (taskId: string, status: string) => Promise<void>;
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: "bg-red-100", text: "text-red-700", label: "Urgent" },
  high: { bg: "bg-orange-100", text: "text-orange-700", label: "High" },
  medium: { bg: "bg-blue-100", text: "text-blue-700", label: "Medium" },
  low: { bg: "bg-slate-100", text: "text-slate-600", label: "Low" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  to_do: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400", label: "To Do" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "In Progress" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Completed" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TaskDetailModal({ task, onClose, onComplete, onStatusChange }: TaskDetailModalProps) {
  const [completing, setCompleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const priority = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
  const status = STATUS_STYLES[task.status] || STATUS_STYLES.to_do;
  const isOverdue = task.dueDate && task.status !== "completed" && task.dueDate < new Date().toISOString().split("T")[0];
  const assigneeName = task.worker?.name || task.assigneeName || null;

  const handleComplete = async () => {
    if (!onComplete) return;
    setCompleting(true);
    try {
      await onComplete(task.id);
    } finally {
      setCompleting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!onStatusChange) return;
    setChangingStatus(true);
    try {
      await onStatusChange(task.id, newStatus);
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className={`text-base font-bold ${task.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"}`}>
              {task.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priority.bg} ${priority.text}`}>
                {priority.label}
              </span>
              {task.autoCreated && (
                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium">Auto</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Description */}
          {task.description && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <FileText size={12} />
                <span className="font-semibold">Description</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Assignee */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                <User size={10} /> Assigned To
              </div>
              <p className="text-sm font-medium text-slate-800">
                {assigneeName || "Unassigned"}
              </p>
            </div>

            {/* Due Date */}
            <div className={`rounded-lg p-3 ${isOverdue ? "bg-red-50" : "bg-slate-50"}`}>
              <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1 ${isOverdue ? "text-red-400" : "text-slate-400"}`}>
                <Calendar size={10} /> Due Date
              </div>
              <p className={`text-sm font-medium ${isOverdue ? "text-red-700" : "text-slate-800"}`}>
                {task.dueDate ? formatDate(task.dueDate) : "No due date"}
              </p>
              {isOverdue && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-red-600 font-medium">
                  <AlertTriangle size={9} /> Overdue
                </div>
              )}
            </div>

            {/* Created */}
            {task.createdAt && (
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  <Clock size={10} /> Created
                </div>
                <p className="text-sm font-medium text-slate-800">
                  {formatDate(task.createdAt)}
                </p>
              </div>
            )}

            {/* Completed */}
            {task.completedAt && (
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 uppercase tracking-wider mb-1">
                  <CheckCircle size={10} /> Completed
                </div>
                <p className="text-sm font-medium text-emerald-800">
                  {formatDate(task.completedAt)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        {task.status !== "completed" && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
            {task.status === "to_do" && onStatusChange && (
              <button
                onClick={() => handleStatusChange("in_progress")}
                disabled={changingStatus}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
              >
                {changingStatus ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
                Start Task
              </button>
            )}
            {onComplete && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 ml-auto"
              >
                {completing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                Mark Complete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
