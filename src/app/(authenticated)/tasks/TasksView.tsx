"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/LanguageProvider";
import Link from "next/link";
import { logger } from "@/lib/logger";
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  X,
  Calendar,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Settings,
  Circle,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import Pagination from "@/components/Pagination";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "to_do" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  linkedEntityType: "lead" | "project" | "estimate" | "consultation_estimate" | null;
  linkedEntityId: string | null;
  autoCreated: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  worker: { id: string; name: string } | null;
  lead: { id: string; firstName: string; lastName: string; company?: { name: string } | null } | null;
  project: { id: string; name: string } | null;
  estimate: { id: string; estimateNumber: string } | null;
};

type Worker = {
  id: string;
  name: string;
};

type TasksViewProps = {
  tasks: any[];
  workers: any[];
  userRole: string;
  technicianWorkerId: string | null;
  currentUserWorkerId: string | null;
};

type FormData = {
  title: string;
  description: string;
  status: "to_do" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: string;
  assignedTo: string;
  linkedEntityType: string;
  linkedEntityId: string;
};

// Utility functions
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntilDue(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  d.setHours(0, 0, 0, 0);
  return d >= today && d <= endOfWeek;
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function completedThisWeek(task: Task): boolean {
  if (task.status !== "completed" || !task.completedAt) return false;
  const completed = new Date(task.completedAt);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return completed >= startOfWeek;
}

function getPriorityBadge(priority: string): string {
  switch (priority) {
    case "low":
      return "bg-slate-100 text-slate-600";
    case "medium":
      return "bg-amber-100 text-amber-700";
    case "high":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStatusBadge(status: string): string {
  switch (status) {
    case "to_do":
      return "bg-slate-100 border-slate-300 text-slate-700";
    case "in_progress":
      return "bg-blue-50 border-blue-300 text-blue-700";
    case "completed":
      return "bg-emerald-50 border-emerald-300 text-emerald-700";
    default:
      return "bg-slate-100 border-slate-300 text-slate-700";
  }
}

function getLinkedEntityLabel(task: Task): string {
  if (task.linkedEntityType === "lead" && task.lead) {
    return `Lead: ${[task.lead.firstName, task.lead.lastName].filter(Boolean).join(" ")}`;
  }
  if (task.linkedEntityType === "project" && task.project) {
    return `Project: ${task.project.name}`;
  }
  if (task.linkedEntityType === "estimate" && task.estimate) {
    return `Estimate: ${task.estimate.estimateNumber}`;
  }
  if (task.linkedEntityType === "consultation_estimate" && task.linkedEntityId) {
    return "Post-Cost Form";
  }
  return "";
}

function getLinkedEntityHref(task: Task): string | null {
  if (task.linkedEntityType === "lead" && task.linkedEntityId) {
    return `/leads/${task.linkedEntityId}`;
  }
  if (task.linkedEntityType === "project" && task.linkedEntityId) {
    return `/projects/${task.linkedEntityId}`;
  }
  if (task.linkedEntityType === "estimate" && task.linkedEntityId) {
    return `/estimates/${task.linkedEntityId}`;
  }
  if (task.linkedEntityType === "consultation_estimate" && task.linkedEntityId) {
    return `/estimates/consultation/${task.linkedEntityId}/edit`;
  }
  return null;
}

const STATUS_LABELS: Record<string, string> = {
  to_do: "To Do",
  in_progress: "In Progress",
  completed: "Done",
};
const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const getColumns = (t: any) => [
  { key: "to_do", label: t("tasks.toDo"), color: "bg-slate-100 border-slate-300 text-slate-700" },
  { key: "in_progress", label: t("tasks.inProgress"), color: "bg-blue-50 border-blue-300 text-blue-700" },
  { key: "completed", label: t("tasks.done"), color: "bg-emerald-50 border-emerald-300 text-emerald-700" },
];

type QuickFilter = "none" | "overdue" | "today" | "week" | "completed_week";

export default function TasksView({
  tasks,
  workers,
  userRole,
  technicianWorkerId,
  currentUserWorkerId,
}: TasksViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "to_do" | "in_progress" | "completed">("active");
  const [assigneeFilter, setAssigneeFilter] = useState<string>(
    userRole !== "TECHNICIAN" && currentUserWorkerId ? currentUserWorkerId : "all"
  );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("none");
  const [sortField, setSortField] = useState<"title" | "dueDate" | "priority" | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const TASKS_PAGE_SIZE = 25;
  const [tasksPage, setTasksPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    status: "to_do",
    priority: "medium",
    dueDate: "",
    assignedTo: "",
    linkedEntityType: "",
    linkedEntityId: "",
  });

  // Role-filtered tasks (base set for stats)
  const roleFilteredTasks = useMemo(() => {
    let result = [...tasks];
    if (userRole === "TECHNICIAN" && technicianWorkerId) {
      result = result.filter((t) => t.assignedTo === technicianWorkerId);
    }
    return result;
  }, [tasks, userRole, technicianWorkerId]);

  // Stats computed from role-filtered tasks (before user filters)
  const stats = useMemo(() => {
    const overdue = roleFilteredTasks.filter(
      (t) => t.status !== "completed" && daysUntilDue(t.dueDate) !== null && daysUntilDue(t.dueDate)! < 0
    ).length;
    const dueToday = roleFilteredTasks.filter(
      (t) => t.status !== "completed" && isToday(t.dueDate)
    ).length;
    const dueThisWeek = roleFilteredTasks.filter(
      (t) => t.status !== "completed" && isThisWeek(t.dueDate)
    ).length;
    const completedWeek = roleFilteredTasks.filter((t) => completedThisWeek(t)).length;
    return { overdue, dueToday, dueThisWeek, completedWeek };
  }, [roleFilteredTasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = [...roleFilteredTasks];

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((t) => t.status !== "completed");
    } else if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    if (assigneeFilter !== "all") {
      result = result.filter((t) => t.assignedTo === assigneeFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
      );
    }

    // Quick filter from stats bar
    if (quickFilter === "overdue") {
      result = result.filter(
        (t) => t.status !== "completed" && daysUntilDue(t.dueDate) !== null && daysUntilDue(t.dueDate)! < 0
      );
    } else if (quickFilter === "today") {
      result = result.filter((t) => t.status !== "completed" && isToday(t.dueDate));
    } else if (quickFilter === "week") {
      result = result.filter((t) => t.status !== "completed" && isThisWeek(t.dueDate));
    } else if (quickFilter === "completed_week") {
      result = result.filter((t) => completedThisWeek(t));
    }

    return result;
  }, [roleFilteredTasks, search, priorityFilter, statusFilter, assigneeFilter, quickFilter]);

  // Sort tasks for list view
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") {
        cmp = a.title.localeCompare(b.title);
      } else if (sortField === "dueDate") {
        cmp = new Date(a.dueDate || "9999-12-31").getTime() - new Date(b.dueDate || "9999-12-31").getTime();
      } else if (sortField === "priority") {
        const order = { high: 0, medium: 1, low: 2 };
        cmp =
          (order[a.priority as keyof typeof order] ?? 1) -
          (order[b.priority as keyof typeof order] ?? 1);
      } else {
        cmp = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredTasks, sortField, sortDir]);

  const tasksTotalPages = Math.ceil(sortedTasks.length / TASKS_PAGE_SIZE);
  const paginatedTasks = useMemo(() => {
    const start = (tasksPage - 1) * TASKS_PAGE_SIZE;
    return sortedTasks.slice(start, start + TASKS_PAGE_SIZE);
  }, [sortedTasks, tasksPage]);

  // Reset page when filters change
  useMemo(() => { setTasksPage(1); }, [search, priorityFilter, statusFilter, assigneeFilter, quickFilter]);

  // Quick complete / uncomplete
  const handleQuickComplete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const newStatus = task.status === "completed" ? "to_do" : "completed";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  };

  const handleDrop = async (taskId: string, newStatus: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  };

  const openNewTask = () => {
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      status: "to_do",
      priority: "medium",
      dueDate: "",
      assignedTo: "",
      linkedEntityType: "",
      linkedEntityId: "",
    });
    setModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      assignedTo: task.assignedTo || "",
      linkedEntityType: task.linkedEntityType || "",
      linkedEntityId: task.linkedEntityId || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    const payload = {
      ...formData,
      dueDate: formData.dueDate || null,
      assignedTo: formData.assignedTo || null,
      linkedEntityType: formData.linkedEntityType || null,
      linkedEntityId: formData.linkedEntityId || null,
    };

    try {
      if (editingTask) {
        await fetch(`/api/tasks/${editingTask.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      router.refresh();
    } catch (error) {
      logger.error("Failed to save task:", { error: String(error) });
      alert("Failed to save task");
    }
  };

  const handleDelete = async () => {
    if (!editingTask || !confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await fetch(`/api/tasks/${editingTask.id}`, { method: "DELETE" });
      setModalOpen(false);
      router.refresh();
    } catch (error) {
      logger.error("Failed to delete task:", { error: String(error) });
      alert("Failed to delete task");
    }
  };

  const toggleQuickFilter = (filter: QuickFilter) => {
    if (quickFilter === filter) {
      setQuickFilter("none");
      // Reset status filter when clearing quick filter
      if (filter === "completed_week") setStatusFilter("active");
    } else {
      setQuickFilter(filter);
      // When clicking "completed this week", switch to show completed
      if (filter === "completed_week") setStatusFilter("all");
      // For other quick filters, ensure we're showing active tasks
      else setStatusFilter("active");
    }
  };

  const isMyTasks = assigneeFilter === currentUserWorkerId;

  // Columns for kanban — hide "completed" column when status filter is "active"
  const visibleColumns = useMemo(() => {
    const cols = getColumns(t);
    if (statusFilter === "active") {
      return cols.filter((c) => c.key !== "completed");
    }
    if (statusFilter !== "all") {
      return cols.filter((c) => c.key === statusFilter);
    }
    return cols;
  }, [t, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{t("tasks.title")}</h1>
          <span className="text-xs font-semibold bg-[#7BC143] bg-opacity-20 text-[#7BC143] px-2 py-0.5 rounded-full">
            {filteredTasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {userRole !== "TECHNICIAN" && (
            <>
              <Link
                href="/tasks/automations"
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                <Settings size={14} /> {t("tasks.automations")}
              </Link>
              <button
                onClick={openNewTask}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#7BC143] text-white text-sm rounded-full hover:bg-[#6aad38]"
              >
                <Plus size={14} /> {t("tasks.newTask")}
              </button>
            </>
          )}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-2 rounded transition ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded transition ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => toggleQuickFilter("overdue")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            quickFilter === "overdue"
              ? "bg-red-600 text-white"
              : stats.overdue > 0
              ? "bg-red-50 text-red-700 hover:bg-red-100"
              : "bg-slate-50 text-slate-400"
          }`}
        >
          <AlertCircle size={13} />
          Overdue
          <span className={`font-bold ${quickFilter === "overdue" ? "text-white" : ""}`}>
            {stats.overdue}
          </span>
        </button>
        <button
          onClick={() => toggleQuickFilter("today")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            quickFilter === "today"
              ? "bg-amber-600 text-white"
              : stats.dueToday > 0
              ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
              : "bg-slate-50 text-slate-400"
          }`}
        >
          <Clock size={13} />
          Due Today
          <span className={`font-bold ${quickFilter === "today" ? "text-white" : ""}`}>
            {stats.dueToday}
          </span>
        </button>
        <button
          onClick={() => toggleQuickFilter("week")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            quickFilter === "week"
              ? "bg-blue-600 text-white"
              : stats.dueThisWeek > 0
              ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "bg-slate-50 text-slate-400"
          }`}
        >
          <Calendar size={13} />
          Due This Week
          <span className={`font-bold ${quickFilter === "week" ? "text-white" : ""}`}>
            {stats.dueThisWeek}
          </span>
        </button>
        <button
          onClick={() => toggleQuickFilter("completed_week")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            quickFilter === "completed_week"
              ? "bg-emerald-600 text-white"
              : stats.completedWeek > 0
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-slate-50 text-slate-400"
          }`}
        >
          <CheckCircle2 size={13} />
          Completed This Week
          <span className={`font-bold ${quickFilter === "completed_week" ? "text-white" : ""}`}>
            {stats.completedWeek}
          </span>
        </button>
      </div>

      {/* Filters toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as any);
            setQuickFilter("none");
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-full bg-white"
        >
          <option value="active">Active Tasks</option>
          <option value="all">All Statuses</option>
          <option value="to_do">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value as "all" | "low" | "medium" | "high")
          }
          className="px-3 py-2 text-sm border border-slate-200 rounded-full bg-white"
        >
          <option value="all">All Priorities</option>
          <option value="low">{t("common.low")}</option>
          <option value="medium">{t("common.medium")}</option>
          <option value="high">{t("common.high")}</option>
        </select>
        {userRole !== "TECHNICIAN" && (
          <>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-full bg-white"
            >
              <option value="all">All Assignees</option>
              {workers.map((w: Worker) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {currentUserWorkerId && (
              <button
                onClick={() =>
                  setAssigneeFilter(isMyTasks ? "all" : currentUserWorkerId)
                }
                className={`px-3 py-2 text-sm rounded-full font-medium transition ${
                  isMyTasks
                    ? "bg-[#7BC143] text-white hover:bg-[#6aad38]"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {isMyTasks ? "My Tasks" : "My Tasks"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <>
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ClipboardList size={48} className="mb-3 text-slate-300" />
              <p className="text-lg font-medium text-slate-500">
                {isMyTasks ? "You're all caught up!" : "No tasks match your filters"}
              </p>
              <p className="text-sm mt-1">
                {isMyTasks
                  ? "No active tasks assigned to you."
                  : "Try adjusting your filters to see more tasks."}
              </p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {visibleColumns.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.key);
                return (
                  <div
                    key={col.key}
                    className="flex-shrink-0 w-[320px]"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("ring-2", "ring-[#7BC143]");
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove("ring-2", "ring-[#7BC143]");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("ring-2", "ring-[#7BC143]");
                      const id = e.dataTransfer.getData("text/plain");
                      if (id) handleDrop(id, col.key);
                    }}
                  >
                    <div className={`rounded-t-2xl px-3 py-2 border-b-2 ${col.color}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">
                          {col.label}
                        </span>
                        <span className="text-[10px] font-medium bg-white/60 px-1.5 py-0.5 rounded">
                          {colTasks.length}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-b-2xl border border-t-0 border-slate-200 min-h-[200px] p-2 space-y-2">
                      {colTasks.map((task) => {
                        const days = daysUntilDue(task.dueDate);
                        const isOverdue = task.status !== "completed" && days !== null && days < 0;
                        const entityLabel = getLinkedEntityLabel(task);
                        const entityHref = getLinkedEntityHref(task);

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) =>
                              e.dataTransfer.setData("text/plain", task.id)
                            }
                            onClick={() => openEditTask(task)}
                            className={`bg-white rounded-2xl border p-3 cursor-grab active:cursor-grabbing hover:border-[#7BC143] transition shadow-sm ${
                              isOverdue
                                ? "border-l-2 border-l-red-400 border-slate-200"
                                : "border-slate-200"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {/* Quick complete checkbox */}
                              <button
                                onClick={(e) => handleQuickComplete(e, task)}
                                className="mt-0.5 flex-shrink-0 group"
                                title={task.status === "completed" ? "Mark incomplete" : "Mark complete"}
                              >
                                {task.status === "completed" ? (
                                  <CheckCircle2 size={18} className="text-emerald-500" />
                                ) : (
                                  <Circle
                                    size={18}
                                    className="text-slate-300 group-hover:text-emerald-400 transition-colors"
                                  />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium mb-1 ${
                                  task.status === "completed"
                                    ? "text-slate-400 line-through"
                                    : "text-slate-800"
                                }`}>
                                  {task.title}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                  <span
                                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${getPriorityBadge(
                                      task.priority
                                    )}`}
                                  >
                                    {PRIORITY_LABELS[task.priority] || task.priority}
                                  </span>
                                  {task.autoCreated && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                      Auto
                                    </span>
                                  )}
                                </div>
                                {task.worker && (
                                  <div className="text-[11px] text-slate-500 mb-1">
                                    {task.worker.name}
                                  </div>
                                )}
                                {task.dueDate && (
                                  <div
                                    className={`text-[10px] ${
                                      isOverdue
                                        ? "text-red-500 font-medium"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    Due {formatDate(task.dueDate)}
                                    {isOverdue && " (Overdue)"}
                                  </div>
                                )}
                                {entityLabel && (
                                  entityHref ? (
                                    <Link
                                      href={entityHref}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[10px] text-[#7BC143] hover:text-[#6aad38] hover:underline mt-1 inline-block"
                                    >
                                      {entityLabel}
                                    </Link>
                                  ) : (
                                    <div className="text-[10px] text-[#7BC143] mt-1">
                                      {entityLabel}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <>
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ClipboardList size={48} className="mb-3 text-slate-300" />
              <p className="text-lg font-medium text-slate-500">
                {isMyTasks ? "You're all caught up!" : "No tasks match your filters"}
              </p>
              <p className="text-sm mt-1">
                {isMyTasks
                  ? "No active tasks assigned to you."
                  : "Try adjusting your filters to see more tasks."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-3 w-10"></th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => {
                          if (sortField === "title") {
                            setSortDir(sortDir === "asc" ? "desc" : "asc");
                          } else {
                            setSortField("title");
                            setSortDir("asc");
                          }
                        }}
                        className="text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                      >
                        {t("common.name")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Assignee
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t("common.status")}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => {
                          if (sortField === "priority") {
                            setSortDir(sortDir === "asc" ? "desc" : "asc");
                          } else {
                            setSortField("priority");
                            setSortDir("asc");
                          }
                        }}
                        className="text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                      >
                        {t("common.priority")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => {
                          if (sortField === "dueDate") {
                            setSortDir(sortDir === "asc" ? "desc" : "asc");
                          } else {
                            setSortField("dueDate");
                            setSortDir("asc");
                          }
                        }}
                        className="text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                      >
                        {t("common.dueDate")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Linked To
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map((task: Task) => {
                    const days = daysUntilDue(task.dueDate);
                    const isOverdue = task.status !== "completed" && days !== null && days < 0;
                    const entityLabel = getLinkedEntityLabel(task);
                    const entityHref = getLinkedEntityHref(task);

                    return (
                      <tr
                        key={task.id}
                        onClick={() => openEditTask(task)}
                        className={`border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors ${
                          isOverdue ? "bg-red-50/50" : ""
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={(e) => handleQuickComplete(e, task)}
                            className="group"
                            title={task.status === "completed" ? "Mark incomplete" : "Mark complete"}
                          >
                            {task.status === "completed" ? (
                              <CheckCircle2 size={18} className="text-emerald-500" />
                            ) : (
                              <Circle
                                size={18}
                                className="text-slate-300 group-hover:text-emerald-400 transition-colors"
                              />
                            )}
                          </button>
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium ${
                          task.status === "completed"
                            ? "text-slate-400 line-through"
                            : "text-slate-800"
                        }`}>
                          {task.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {task.worker?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-[11px] font-medium border ${getStatusBadge(
                              task.status
                            )}`}
                          >
                            {STATUS_LABELS[task.status] || task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-[9px] font-semibold ${getPriorityBadge(
                              task.priority
                            )}`}
                          >
                            {PRIORITY_LABELS[task.priority] || task.priority}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-sm ${
                            isOverdue ? "text-red-600 font-medium" : "text-slate-600"
                          }`}
                        >
                          {task.dueDate ? formatDate(task.dueDate) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {entityLabel ? (
                            entityHref ? (
                              <Link
                                href={entityHref}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[#7BC143] hover:text-[#6aad38] hover:underline"
                              >
                                {entityLabel}
                              </Link>
                            ) : (
                              <span className="text-slate-600">{entityLabel}</span>
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination
                currentPage={tasksPage}
                totalPages={tasksTotalPages}
                totalItems={sortedTasks.length}
                pageSize={TASKS_PAGE_SIZE}
                onPageChange={setTasksPage}
              />
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingTask ? t("tasks.editTask") : t("tasks.createTask")}
              </h2>
              <button onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  disabled={userRole === "TECHNICIAN"}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Task title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  disabled={userRole === "TECHNICIAN"}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Task description"
                />
              </div>

              {/* Status + Priority row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "to_do" | "in_progress" | "completed",
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="to_do">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    disabled={userRole === "TECHNICIAN"}
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as "low" | "medium" | "high",
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Assignee + Due Date row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Assignee
                  </label>
                  <select
                    disabled={userRole === "TECHNICIAN"}
                    value={formData.assignedTo}
                    onChange={(e) =>
                      setFormData({ ...formData, assignedTo: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="">Unassigned</option>
                    {workers.map((w: Worker) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    disabled={userRole === "TECHNICIAN"}
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Linked Entity Type + ID row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Linked Entity Type
                  </label>
                  <select
                    disabled={userRole === "TECHNICIAN"}
                    value={formData.linkedEntityType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        linkedEntityType: e.target.value,
                        linkedEntityId: "",
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="">None</option>
                    <option value="lead">Lead</option>
                    <option value="project">Project</option>
                    <option value="estimate">Estimate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Entity ID
                  </label>
                  <input
                    type="text"
                    disabled={userRole === "TECHNICIAN" || !formData.linkedEntityType}
                    placeholder="Entity ID"
                    value={formData.linkedEntityId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        linkedEntityId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50 rounded-b-xl">
              {editingTask && userRole !== "TECHNICIAN" && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTask ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
