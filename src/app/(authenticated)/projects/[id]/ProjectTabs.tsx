"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatDate, getStatusColor, getProjectTypes, hasProjectType } from "@/lib/utils";
import { TYPE_LABELS, REGULATIONS } from "@/lib/regulations";
import { Check, Circle, Loader2, Plus, FileDown, ChevronRight, ChevronDown, AlertTriangle, ClipboardList, Clock, Shield, CheckSquare, Award, BarChart3, CalendarDays, Pencil, Save, X, FileText, FolderOpen, Activity, Play, CheckCircle2, User, Upload, FileCheck, ShieldAlert, Trash2, MoreHorizontal, ExternalLink, Star, Send, MessageSquare } from "lucide-react";
import ActivityFeed from "@/components/ActivityFeed";
import TaskDetailModal from "@/components/TaskDetailModal";
import ContentInventoryTab from "@/components/ContentInventoryTab";
import NotesTab from "@/components/NotesTab";
import ProjectBudgetTab from "./ProjectBudgetTab";
import MethDeconReportSection from "./MethDeconReportSection";
import type { ChecklistSection } from "@/lib/regulations";

type Task = { id: string; name: string; status: string; date: Date | null; sortOrder: number };
type CompCheck = { id: string; itemKey: string; checked: boolean };
type FieldReport = {
  id: string;
  date: string;
  supervisorName: string;
  workCompletedToday: string;
  status: string;
  incident: boolean;
  nearMiss: boolean;
  stopWork: boolean;
  createdAt: string;
};

type TimeEntry = {
  id: string;
  projectId: string;
  workerId: string;
  workerName: string;
  role: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  totalHours: number | null;
  notes: string;
};

type PsiJhaSpaEntry = {
  id: string;
  date: string;
  time: string;
  supervisorName: string;
  taskSteps: { step: string; riskRating: number }[];
  status: string;
};

type PreAbatementEntry = {
  id: string;
  date: string;
  inspector: string;
  checklistItems: Record<string, string>;
  status: string;
};

type CertEntry = {
  id: string;
  workSiteAddress: string;
  demobilizationDate: string;
  propertyOwnerName: string;
  status: string;
  createdAt: string;
};

type PostProjectEntry = {
  id: string;
  inspectionDate: string;
  clientName: string;
  projectManagerName: string;
  checklistItems: Record<string, string>;
  status: string;
};

type DocEntry = {
  id: string;
  docType: string;
  title: string;
  referenceNumber: string;
  date: string;
  startDate: string | null;
  endDate: string | null;
  notes: string;
  status: string;
  fileUrl?: string | null;
  fileName?: string | null;
};

type PMWorker = { id: string; name: string; position: string };
type LinkedTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeName: string | null;
  autoCreated: boolean;
};

export default function ProjectTabs({
  project,
  checklist,
  complianceChecks,
  fieldReports = [],
  timeEntries = [],
  psiJhaSpas = [],
  preAbatementInspections = [],
  certificatesOfCompletion = [],
  postProjectInspections = [],
  projectDocuments = [],
  activities = [],
  linkedActivities = [],
  pmEligibleWorkers = [],
  linkedTasks = [],
  projectCoordinatorId = null,
  incidents = [],
  scheduleEntries = [],
  invoices = [],
  allWorkers = [],
  officeManagerId = null,
  linkedConsultationEstimate = null,
}: {
  project: any;
  checklist: ChecklistSection[];
  complianceChecks: CompCheck[];
  fieldReports?: FieldReport[];
  timeEntries?: TimeEntry[];
  psiJhaSpas?: PsiJhaSpaEntry[];
  preAbatementInspections?: PreAbatementEntry[];
  certificatesOfCompletion?: CertEntry[];
  postProjectInspections?: PostProjectEntry[];
  projectDocuments?: DocEntry[];
  activities?: any[];
  linkedActivities?: any[];
  pmEligibleWorkers?: PMWorker[];
  linkedTasks?: LinkedTask[];
  projectCoordinatorId?: string | null;
  incidents?: any[];
  scheduleEntries?: any[];
  invoices?: any[];
  allWorkers?: any[];
  officeManagerId?: string | null;
  linkedConsultationEstimate?: any;
}) {
  const [tab, setTab] = useState<"dashboard" | "tasks" | "reports" | "decon_report" | "documents" | "activity" | "inventory" | "notes" | "budget">("dashboard");
  const router = useRouter();
  const { data: sessionData } = useSession();
  const userRole = (sessionData?.user as any)?.role;
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingPM, setSavingPM] = useState(false);
  const [uploadModal, setUploadModal] = useState<"permit" | "sampling" | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadRef, setUploadRef] = useState("");
  const [uploadStartDate, setUploadStartDate] = useState("");
  const [uploadEndDate, setUploadEndDate] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [gateWaived, setGateWaived] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  // Clearance results state
  const [clearanceResult, setClearanceResult] = useState(project.clearanceResult || "");
  const [clearanceDate, setClearanceDate] = useState(project.clearanceDate || "");
  const [clearanceVendor, setClearanceVendor] = useState(project.clearanceVendor || "");
  const [clearanceCost, setClearanceCost] = useState(project.clearanceCost?.toString() || "");
  const [clearanceNotes, setClearanceNotes] = useState(project.clearanceNotes || "");
  const [clearanceReportFile, setClearanceReportFile] = useState<File | null>(null);
  const [clearanceInvoiceFile, setClearanceInvoiceFile] = useState<File | null>(null);
  const [clearanceSaving, setClearanceSaving] = useState(false);
  const [clearanceSaved, setClearanceSaved] = useState(false);
  const clearanceReportRef = useRef<HTMLInputElement>(null);
  const clearanceInvoiceRef = useRef<HTMLInputElement>(null);

  // Review request state
  const [reviewRequests, setReviewRequests] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewMethod, setReviewMethod] = useState<"email" | "sms" | "both">("both");
  const [reviewLocationKey, setReviewLocationKey] = useState("front_range");
  const [reviewLocations, setReviewLocations] = useState<{ key: string; name: string; reviewUrl: string }[]>([]);
  const [reviewEmail, setReviewEmail] = useState(project.clientEmail || "");
  const [reviewPhone, setReviewPhone] = useState(project.clientPhone || "");

  // Quick-add FAB
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteType, setQuickNoteType] = useState("note");
  const [quickNoteText, setQuickNoteText] = useState("");
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);

  // Check if permit and sampling report have been uploaded
  const hasPermit = projectDocuments.some((d) => d.docType === "state_permit");
  const hasSampling = projectDocuments.some((d) => d.docType === "initial_sampling");
  const canStart = gateWaived || (hasPermit && hasSampling);

  const reportsCount = fieldReports.length + timeEntries.length + psiJhaSpas.length + preAbatementInspections.length + certificatesOfCompletion.length + postProjectInspections.length;

  // Sub-tab within Reports
  const [reportsSub, setReportsSub] = useState<"daily" | "safety" | "closeout">("daily");

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard" },
    { key: "tasks" as const, label: "Tasks" },
    { key: "reports" as const, label: `Reports (${reportsCount})` },
    ...(project.type === "METH" ? [{ key: "decon_report" as const, label: "Decon Report" }] : []),
    { key: "documents" as const, label: `Documents (${projectDocuments.length})` },
    { key: "activity" as const, label: `Activity (${(activities || []).length + (linkedActivities || []).length})` },
    { key: "inventory" as const, label: "Inventory" },
    { key: "notes" as const, label: "Notes" },
    ...(userRole === "ADMIN" ? [{ key: "budget" as const, label: "Budget" }] : []),
  ];

  // Close quick-add on outside click
  useEffect(() => {
    if (!quickAddOpen) return;
    const handler = (e: MouseEvent) => {
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) {
        setQuickAddOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [quickAddOpen]);

  const handleQuickNote = async () => {
    if (!quickNoteText.trim()) return;
    setQuickNoteSaving(true);
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentType: "project",
          parentId: project.id,
          type: quickNoteType,
          description: quickNoteText,
        }),
      });
      setQuickNoteText("");
      setQuickNoteOpen(false);
      router.refresh();
    } catch {} finally {
      setQuickNoteSaving(false);
    }
  };

  async function toggleTask(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === "completed" ? "pending" : currentStatus === "pending" ? "in_progress" : "completed";
    await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  async function toggleCheck(itemKey: string, checked: boolean) {
    await fetch(`/api/projects/${project.id}/compliance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemKey, checked: !checked }),
    });
    router.refresh();
  }

  async function handleSetPM(workerId: string) {
    setSavingPM(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectManagerId: workerId || null }),
    });
    setSavingPM(false);
    router.refresh();
  }

  async function handleStartProject() {
    if (!project.projectManagerId) {
      alert("Please assign a Project Manager before starting the project.");
      return;
    }
    if (!confirm("Start this project? This will create initial paperwork and a closeout task.")) return;
    setStarting(true);
    const today = new Date().toISOString().split("T")[0];

    // 1. Update project status to in_progress
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "in_progress",
        startDate: project.startDate || today,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Error starting project: ${err.error || res.statusText}`);
      setStarting(false);
      return;
    }

    // 2. Create "Project Closeout" task for PM
    if (project.projectManagerId) {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Project Closeout — ${project.name}`,
          description: `Complete closeout procedures for ${project.name}.\n\nAddress: ${project.address}\nProject #: ${project.projectNumber}`,
          status: "to_do",
          priority: "medium",
          dueDate: project.estEndDate || null,
          assignedTo: project.projectManagerId,
          linkedEntityType: "project",
          linkedEntityId: project.id,
          autoCreated: true,
        }),
      });
    }

    // 3. Create "Schedule Final Clearance" task for Project Coordinator (environmental projects)
    const clearanceTypes = ["ASBESTOS", "LEAD", "MOLD", "METH"];
    const projTypes = getProjectTypes(project.type);
    if (projTypes.some((t: string) => clearanceTypes.includes(t))) {
      const assignee = projectCoordinatorId || project.projectManagerId || null;
      const typeLabel = projTypes.filter((t: string) => clearanceTypes.includes(t)).join(" / ").toLowerCase();
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Schedule Final Clearance (Third Party AMS) — ${project.name}`,
          description: `Schedule a final clearance inspection by a third-party Analytical & Monitoring Services (AMS) provider for this ${typeLabel} project.\n\nProject: ${project.name}\nAddress: ${project.address}\nProject #: ${project.projectNumber}\n\nEnsure the AMS provider is independent and accredited. Coordinate scheduling with the field team to align with project completion timeline.`,
          status: "to_do",
          priority: "high",
          dueDate: project.estEndDate || null,
          assignedTo: assignee,
          linkedEntityType: "project",
          linkedEntityId: project.id,
          autoCreated: true,
        }),
      });
    }

    setStarting(false);
    router.refresh();
  }

  async function handleSaveClearance() {
    setClearanceSaving(true);
    setClearanceSaved(false);
    try {
      const formData = new FormData();
      if (clearanceResult) formData.append("result", clearanceResult);
      if (clearanceDate) formData.append("date", clearanceDate);
      if (clearanceVendor) formData.append("vendor", clearanceVendor);
      if (clearanceCost) formData.append("cost", clearanceCost);
      if (clearanceNotes) formData.append("notes", clearanceNotes);
      if (clearanceReportFile) formData.append("report", clearanceReportFile);
      if (clearanceInvoiceFile) formData.append("invoice", clearanceInvoiceFile);

      const res = await fetch(`/api/projects/${project.id}/clearance`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to save clearance");
      setClearanceSaved(true);
      setClearanceReportFile(null);
      setClearanceInvoiceFile(null);
      setTimeout(() => setClearanceSaved(false), 3000);
      router.refresh();
    } catch (e) {
      alert("Error saving clearance results. Please try again.");
    } finally {
      setClearanceSaving(false);
    }
  }

  // Fetch review requests and config for this project
  async function fetchReviewRequests() {
    setReviewLoading(true);
    try {
      const [reqRes, cfgRes] = await Promise.all([
        fetch(`/api/review-requests?projectId=${project.id}`),
        fetch(`/api/review-requests/config`),
      ]);
      if (reqRes.ok) {
        const data = await reqRes.json();
        setReviewRequests(data.requests || []);
      }
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setReviewLocations(cfg.locations || []);
        if (cfg.locations?.length > 0 && !reviewLocationKey) {
          setReviewLocationKey(cfg.locations[0].key);
        }
      }
    } catch {
      // Non-critical
    } finally {
      setReviewLoading(false);
    }
  }

  // Send feedback survey
  async function handleSendReview() {
    setReviewSending(true);
    try {
      const res = await fetch("/api/review-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          method: reviewMethod,
          googleLocationKey: reviewLocationKey,
          clientEmail: reviewEmail,
          clientPhone: reviewPhone,
          clientName: project.client,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to send survey");
        return;
      }
      const result = await res.json();
      if (result.status === "failed") {
        alert(`Survey send failed: ${result.failureReason}`);
      }
      await fetchReviewRequests();
    } catch {
      alert("Failed to send survey. Please try again.");
    } finally {
      setReviewSending(false);
    }
  }

  // Load review requests when closeout tab is shown
  useEffect(() => {
    if (reportsSub === "closeout") {
      fetchReviewRequests();
    }
  }, [reportsSub]);

  async function handleCompleteProject() {
    if (!confirm("Mark this project as completed?")) return;
    setCompleting(true);
    const today = new Date().toISOString().split("T")[0];

    // 1. Update project status to completed
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed", endDate: today }),
    });

    // Calculate actual hours from time entries (completed entries only)
    const completedEntries = timeEntries.filter((e: any) => e.clockOut && e.totalHours != null);
    const actualSupHours = Math.round(
      completedEntries.filter((e: any) => e.role === "supervisor").reduce((sum: number, e: any) => sum + (e.totalHours || 0), 0) * 100
    ) / 100;
    const actualTechHours = Math.round(
      completedEntries.filter((e: any) => e.role === "technician").reduce((sum: number, e: any) => sum + (e.totalHours || 0), 0) * 100
    ) / 100;

    // 2. Create Post-Cost estimate (duplicate of original consultation estimate)
    //    Auto-populate labor hours from actual time clock entries
    let postCostEstimateId: string | null = null;
    if (linkedConsultationEstimate) {
      const { id: _origId, createdAt: _ca, updatedAt: _ua, ...estFields } = linkedConsultationEstimate;

      // Recalculate labor cost with actual hours but original rates
      const supRate = linkedConsultationEstimate.supervisorRate || 0;
      const techRate = linkedConsultationEstimate.technicianRate || 0;
      const supOtHours = linkedConsultationEstimate.supervisorOtHours || 0;
      const techOtHours = linkedConsultationEstimate.technicianOtHours || 0;
      const actualLaborCost = Math.round(
        (actualSupHours * supRate + supOtHours * supRate * 1.5 +
         actualTechHours * techRate + techOtHours * techRate * 1.5) * 100
      ) / 100;

      const postCostRes = await fetch("/api/consultation-estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Copy ALL fields from the pre-cost estimate first
          ...estFields,
          // Then override only what needs to change
          status: "post_cost",
          customerName: `Post-Cost — ${project.name}`,
          projectId: project.id,
          projectNumber: project.projectNumber,
          isPostCost: true,
          originalEstimateId: linkedConsultationEstimate.id,
          // Replace regular hours with actuals from time clock;
          // OT hours carry over from pre-cost for OM to adjust
          supervisorHours: actualSupHours,
          technicianHours: actualTechHours,
          laborSupervisor: { regularHours: actualSupHours, otHours: supOtHours },
          laborTechnician: { regularHours: actualTechHours, otHours: techOtHours },
          laborCost: actualLaborCost,
          laborTotal: actualLaborCost,
        }),
      });
      if (postCostRes.ok) {
        const postCostData = await postCostRes.json();
        postCostEstimateId = postCostData.id;
      }
    }

    // 3. Create "Complete Post-Cost" task for Office Manager
    // Link directly to the post-cost estimate so the OM can open it in one click
    const omAssignee = officeManagerId || project.projectManagerId || null;
    const postCostLink = postCostEstimateId
      ? `/estimates/consultation/${postCostEstimateId}/edit`
      : `/projects/${project.id}`;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Complete Post-Cost — ${project.name}`,
        description: `Project has been marked complete. Review the Post-Cost form — all estimate data has been carried over. Labor hours have been auto-populated from time clock entries (Supervisor: ${actualSupHours}h, Technician: ${actualTechHours}h). Please verify hours are correct and update any COGS or materials that changed from the original estimate.\n\nProject: ${project.name}\nAddress: ${project.address}\nProject #: ${project.projectNumber}\n\nOpen Post-Cost Form: ${postCostLink}`,
        status: "to_do",
        priority: "high",
        dueDate: today,
        assignedTo: omAssignee,
        linkedEntityType: postCostEstimateId ? "consultation_estimate" : "project",
        linkedEntityId: postCostEstimateId || project.id,
        autoCreated: true,
      }),
    });

    // 4. Create "Send Invoice" task for Office Manager
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Send Invoice — ${project.name}`,
        description: `Project has been marked complete. Prepare and send the final invoice to the client.\n\nProject: ${project.name}\nClient: ${project.client || ""}\nAddress: ${project.address}\nProject #: ${project.projectNumber}`,
        status: "to_do",
        priority: "high",
        dueDate: today,
        assignedTo: omAssignee,
        linkedEntityType: "project",
        linkedEntityId: project.id,
        autoCreated: true,
      }),
    });

    // 5. Auto-send feedback survey if client has contact info and auto-send is enabled
    if (project.clientEmail || project.clientPhone) {
      try {
        const cfgRes = await fetch("/api/review-requests/config");
        const cfg = cfgRes.ok ? await cfgRes.json() : { autoSendEnabled: true };
        if (cfg.autoSendEnabled !== false) {
          await fetch("/api/review-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: project.id,
              method: cfg.defaultMethod || "both",
              googleLocationKey: cfg.locations?.[0]?.key || "front_range",
              clientName: project.client,
              clientEmail: project.clientEmail,
              clientPhone: project.clientPhone,
            }),
          });
        }
      } catch {
        // Non-critical — survey send failure shouldn't block completion
      }
    }

    setCompleting(false);
    router.refresh();
  }

  async function handleDeleteProject() {
    if (!confirm(`Delete "${project.name}"? This will permanently remove the project and all related data (tasks, reports, documents, etc.). This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Error deleting project: ${err.error || res.statusText}`);
      setDeleting(false);
      return;
    }
    router.push("/projects");
  }

  async function handleUploadDocument() {
    if (!uploadModal) return;
    setUploadSaving(true);
    const docType = uploadModal === "permit" ? "state_permit" : "initial_sampling";
    const defaultTitle = uploadModal === "permit" ? "Project Permit" : "Initial Sampling Report";
    await fetch(`/api/projects/${project.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docType,
        title: uploadTitle || defaultTitle,
        referenceNumber: uploadRef,
        startDate: uploadStartDate || null,
        endDate: uploadEndDate || null,
        date: uploadStartDate || new Date().toISOString().split("T")[0],
        notes: uploadNotes,
        fileName: uploadFile?.name || null,
        fileSize: uploadFile?.size || null,
        status: uploadModal === "permit" ? "approved" : "received",
      }),
    });
    setUploadSaving(false);
    setUploadModal(null);
    setUploadTitle("");
    setUploadRef("");
    setUploadStartDate("");
    setUploadEndDate("");
    setUploadNotes("");
    setUploadFile(null);
    router.refresh();
  }

  const done = project.tasks.filter((t: Task) => t.status === "completed").length;
  const checkMap = new Map(complianceChecks.map((c) => [c.itemKey, c.checked]));

  // Use first type for regulations; show all applicable
  const regKey = (getProjectTypes(project.type)[0] || "asbestos").toLowerCase() as "asbestos" | "lead" | "meth";
  const regs = REGULATIONS[regKey] || REGULATIONS["asbestos"];

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    reviewed: "bg-green-100 text-green-800",
  };

  const pmName = pmEligibleWorkers.find((w) => w.id === project.projectManagerId)?.name;

  return (
    <div>
      {/* Project Action Bar */}
      <div className="bg-white rounded-lg border border-slate-200 px-4 py-2.5 mb-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: PM selector */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <User size={14} className="text-slate-400 flex-shrink-0" />
            <select
              value={project.projectManagerId || ""}
              onChange={(e) => handleSetPM(e.target.value)}
              disabled={savingPM}
              className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 focus:ring-indigo-500 focus:border-indigo-500 max-w-[180px] min-w-0"
            >
              <option value="">Unassigned</option>
              {pmEligibleWorkers.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.position})</option>
              ))}
            </select>
            {savingPM && <Loader2 size={14} className="animate-spin text-indigo-500" />}
          </div>

          {/* Right: Desktop action buttons inline + Mobile overflow */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Desktop inline buttons */}
            <div className="hidden md:flex items-center gap-2">
              {project.status === "planning" && (
                <>
                  <button
                    onClick={() => { setUploadModal("permit"); setUploadTitle(""); setUploadRef(project.permitNumber || ""); setUploadStartDate(""); setUploadEndDate(""); setUploadNotes(""); setUploadFile(null); }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition border ${
                      hasPermit ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    {hasPermit ? <FileCheck size={12} /> : <Upload size={12} />}
                    Permit {hasPermit ? "✓" : ""}
                  </button>
                  <button
                    onClick={() => { setUploadModal("sampling"); setUploadTitle(""); setUploadRef(""); setUploadStartDate(""); setUploadEndDate(""); setUploadNotes(""); setUploadFile(null); }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition border ${
                      hasSampling ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    {hasSampling ? <FileCheck size={12} /> : <Upload size={12} />}
                    Sampling {hasSampling ? "✓" : ""}
                  </button>
                  {(!hasPermit || !hasSampling) && (
                    <button
                      onClick={() => { if (!gateWaived) { if (confirm("Waive permit/sampling requirement?")) setGateWaived(true); } else { setGateWaived(false); } }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition border ${gateWaived ? "bg-slate-100 text-slate-600 border-slate-300" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                    >
                      <Shield size={12} /> {gateWaived ? "Waived" : "Waive"}
                    </button>
                  )}
                  <button onClick={handleStartProject} disabled={starting || !canStart} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                    {starting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Start
                  </button>
                </>
              )}
              {project.status === "in_progress" && (
                <button onClick={handleCompleteProject} disabled={completing} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                  {completing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Complete
                </button>
              )}
              <button onClick={handleDeleteProject} disabled={deleting} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition">
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
              </button>
            </div>

            {/* Mobile overflow menu button */}
            <div className="relative md:hidden">
              <button
                onClick={() => setMobileActionsOpen(!mobileActionsOpen)}
                className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <MoreHorizontal size={18} />
              </button>
              {mobileActionsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMobileActionsOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-slate-200 shadow-lg z-50 py-1">
                    {project.status === "planning" && (
                      <>
                        <button onClick={() => { setMobileActionsOpen(false); setUploadModal("permit"); setUploadTitle(""); setUploadRef(project.permitNumber || ""); setUploadStartDate(""); setUploadEndDate(""); setUploadNotes(""); setUploadFile(null); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                          {hasPermit ? <FileCheck size={14} className="text-emerald-600" /> : <Upload size={14} className="text-amber-600" />}
                          Upload Permit {hasPermit ? "✓" : ""}
                        </button>
                        <button onClick={() => { setMobileActionsOpen(false); setUploadModal("sampling"); setUploadTitle(""); setUploadRef(""); setUploadStartDate(""); setUploadEndDate(""); setUploadNotes(""); setUploadFile(null); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                          {hasSampling ? <FileCheck size={14} className="text-emerald-600" /> : <Upload size={14} className="text-amber-600" />}
                          Upload Sampling {hasSampling ? "✓" : ""}
                        </button>
                        {(!hasPermit || !hasSampling) && (
                          <button onClick={() => { setMobileActionsOpen(false); if (!gateWaived) { if (confirm("Waive permit/sampling requirement?")) setGateWaived(true); } else { setGateWaived(false); } }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                            <Shield size={14} className="text-slate-400" />
                            {gateWaived ? "Unwaive Requirements" : "Waive Requirements"}
                          </button>
                        )}
                        <div className="border-t border-slate-100 my-1" />
                        <button onClick={() => { setMobileActionsOpen(false); handleStartProject(); }} disabled={starting || !canStart} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                          <Play size={14} /> Start Project
                        </button>
                      </>
                    )}
                    {project.status === "in_progress" && (
                      <button onClick={() => { setMobileActionsOpen(false); handleCompleteProject(); }} disabled={completing} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                        <CheckCircle2 size={14} /> Complete Project
                      </button>
                    )}
                    <div className="border-t border-slate-100 my-1" />
                    <button onClick={() => { setMobileActionsOpen(false); handleDeleteProject(); }} disabled={deleting} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                      <Trash2 size={14} /> Delete Project
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tab Selector — dropdown */}
      <div className="md:hidden mb-4">
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as any)}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-full bg-white focus:ring-[#7BC143] focus:border-[#7BC143]"
        >
          {tabs.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Desktop Tab Bar */}
      <div className="hidden md:flex gap-0 border-b border-slate-200 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              tab === t.key ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <DashboardTab
          project={project}
          timeEntries={timeEntries}
          fieldReports={fieldReports}
          tasksDone={done}
          tasksTotal={project.tasks.length}
          psiCount={psiJhaSpas.length}
          preAbatementCount={preAbatementInspections.length}
          certsCount={certificatesOfCompletion.length}
          projectDocuments={projectDocuments}
          linkedTasks={linkedTasks}
          projectCoordinatorId={projectCoordinatorId}
          incidents={incidents}
          scheduleEntries={scheduleEntries}
          invoices={invoices}
          allWorkers={allWorkers}
          postProjectInspections={postProjectInspections}
        />
      )}

      {tab === "tasks" && (
        <div className="space-y-4">
          {/* Linked Global Tasks (Assigned Tasks) */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Project Tasks</h3>
              <span className="text-xs text-slate-400">{linkedTasks.length} task{linkedTasks.length !== 1 ? "s" : ""}</span>
            </div>
            {linkedTasks.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No tasks linked to this project yet. Tasks created from the Tasks page or auto-generated when the project starts will appear here.</p>
            ) : (
              <div className="space-y-1">
                {linkedTasks.map((lt) => {
                  const isOverdue = lt.dueDate && lt.status !== "completed" && lt.dueDate < new Date().toISOString().split("T")[0];
                  const priorityColors: Record<string, string> = {
                    urgent: "bg-red-100 text-red-700",
                    high: "bg-orange-100 text-orange-700",
                    medium: "bg-blue-100 text-blue-700",
                    low: "bg-slate-100 text-slate-600",
                  };
                  return (
                    <button
                      key={lt.id}
                      onClick={() => setSelectedTask(lt)}
                      className={`w-full flex items-center gap-3 py-2.5 px-3 rounded hover:bg-slate-50 transition text-left ${isOverdue ? "bg-red-50/50" : ""}`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        lt.status === "completed" ? "bg-emerald-500" :
                        lt.status === "in_progress" ? "bg-blue-500" : "border-2 border-slate-300"
                      }`}>
                        {lt.status === "completed" && <Check size={12} className="text-white" />}
                        {lt.status === "in_progress" && <Loader2 size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${lt.status === "completed" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                          {lt.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lt.assigneeName && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                              <User size={9} /> {lt.assigneeName}
                            </span>
                          )}
                          {lt.autoCreated && (
                            <span className="text-[9px] px-1 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium">Auto</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded capitalize ${priorityColors[lt.priority] || priorityColors.medium}`}>
                          {lt.priority}
                        </span>
                        {lt.dueDate && (
                          <span className={`text-[10px] font-medium ${isOverdue ? "text-red-600" : "text-slate-400"}`}>
                            {new Date(lt.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───── Daily Logs (Field Reports + Time Reports) ───── */}
      {/* ───── Reports (Daily Logs + Safety + Closeout) ───── */}
      {tab === "reports" && (
        <div className="space-y-4">
          {/* Sub-tab navigation */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {([
              { key: "daily" as const, label: "Daily Logs", icon: ClipboardList, count: fieldReports.length + timeEntries.length },
              { key: "safety" as const, label: "Safety", icon: Shield, count: psiJhaSpas.length + preAbatementInspections.length },
              { key: "closeout" as const, label: "Closeout", icon: Award, count: certificatesOfCompletion.length + postProjectInspections.length },
            ]).map((sub) => {
              const SubIcon = sub.icon;
              return (
                <button
                  key={sub.key}
                  onClick={() => setReportsSub(sub.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition ${
                    reportsSub === sub.key
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <SubIcon size={13} />
                  <span>{sub.label}</span>
                  {sub.count > 0 && (
                    <span className={`ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                      reportsSub === sub.key ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-500"
                    }`}>
                      {sub.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Daily Logs sub-tab */}
          {reportsSub === "daily" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <ClipboardList size={16} className="text-indigo-500" />
                    Field Reports ({fieldReports.length})
                  </h3>
                  <Link href={`/field-reports/new?projectId=${project.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition">
                    <Plus size={14} /> New Report
                  </Link>
                </div>
                {fieldReports.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-500">No field reports yet</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Date</th>
                          <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Supervisor</th>
                          <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Work Done</th>
                          <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Safety</th>
                          <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Status</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fieldReports.map((report) => {
                          const hasSafetyEvent = report.incident || report.nearMiss || report.stopWork;
                          return (
                            <tr key={report.id} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-2 font-medium text-slate-900 whitespace-nowrap">
                                {new Date(report.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                              </td>
                              <td className="px-4 py-2 text-slate-600">{report.supervisorName || "—"}</td>
                              <td className="px-4 py-2 text-slate-600 max-w-xs truncate">{report.workCompletedToday || "—"}</td>
                              <td className="px-4 py-2">
                                {hasSafetyEvent ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                    <AlertTriangle size={11} /> Flagged
                                  </span>
                                ) : (
                                  <span className="text-green-600 text-xs">Clear</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[report.status] || "bg-slate-100"}`}>
                                  {report.status}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2 justify-end">
                                  <a href={`/api/field-reports/${report.id}/pdf`} className="text-slate-400 hover:text-indigo-600" title="Download PDF">
                                    <FileDown size={15} />
                                  </a>
                                  <Link href={`/field-reports/${report.id}`} className="text-slate-400 hover:text-indigo-600">
                                    <ChevronRight size={16} />
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Clock size={16} className="text-indigo-500" />
                    Time Reports ({timeEntries.length})
                  </h3>
                  <Link href="/time-clock"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition">
                    <Clock size={14} /> Open Time Clock
                  </Link>
                </div>
                <TimeReportsTab entries={timeEntries} projectId={project.id} />
              </div>
            </div>
          )}

          {/* Safety sub-tab */}
          {reportsSub === "safety" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Shield size={16} className="text-indigo-500" />
                    PSI / JHA / SPA ({psiJhaSpas.length})
                  </h3>
                </div>
                <PsiTab entries={psiJhaSpas} projectId={project.id} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <CheckSquare size={16} className="text-indigo-500" />
                    Pre-Abatement Inspections ({preAbatementInspections.length})
                  </h3>
                </div>
                <PreAbatementTab entries={preAbatementInspections} projectId={project.id} />
              </div>
            </div>
          )}

          {/* Closeout sub-tab */}
          {reportsSub === "closeout" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Award size={16} className="text-indigo-500" />
                    Certificates of Completion ({certificatesOfCompletion.length})
                  </h3>
                </div>
                <CertsTab entries={certificatesOfCompletion} projectId={project.id} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <ClipboardList size={16} className="text-indigo-500" />
                    Post-Project Inspections ({postProjectInspections.length})
                  </h3>
                </div>
                <PostProjectTab entries={postProjectInspections} projectId={project.id} />
              </div>

              {/* ─── Air Clearance Results ─── */}
              <div className="border border-slate-200 rounded-xl bg-white">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-700">Air Clearance Results</h3>
                  {project.clearanceResult === "pass" && (
                    <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">PASS</span>
                  )}
                  {project.clearanceResult === "fail" && (
                    <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">FAIL</span>
                  )}
                  {project.clearanceResult === "pending" && (
                    <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">PENDING</span>
                  )}
                </div>
                <div className="px-5 py-4 space-y-4">
                  {/* Row 1: Result + Date + Vendor */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Result</label>
                      <select
                        value={clearanceResult}
                        onChange={(e) => setClearanceResult(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                      >
                        <option value="">— Select —</option>
                        <option value="pass">Pass</option>
                        <option value="fail">Fail</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Clearance Date</label>
                      <input
                        type="date"
                        value={clearanceDate}
                        onChange={(e) => setClearanceDate(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Vendor / Lab</label>
                      <input
                        type="text"
                        value={clearanceVendor}
                        onChange={(e) => setClearanceVendor(e.target.value)}
                        placeholder="e.g. AMS, Safetech"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  {/* Row 2: Cost + Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={clearanceCost}
                        onChange={(e) => setClearanceCost(e.target.value)}
                        placeholder="425.00"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                      <input
                        type="text"
                        value={clearanceNotes}
                        onChange={(e) => setClearanceNotes(e.target.value)}
                        placeholder="Optional notes"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  {/* Row 3: File uploads */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Clearance Report</label>
                      {project.clearanceReportUrl ? (
                        <div className="flex items-center gap-2 mb-1">
                          <a
                            href={project.clearanceReportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <FileCheck size={14} /> {project.clearanceReportName || "View Report"}
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      ) : null}
                      <label
                        className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition py-3 ${
                          clearanceReportFile ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                        }`}
                      >
                        <input
                          ref={clearanceReportRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => setClearanceReportFile(e.target.files?.[0] || null)}
                        />
                        {clearanceReportFile ? (
                          <span className="text-xs text-emerald-700 font-medium">{clearanceReportFile.name}</span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            <Upload size={14} className="inline mr-1" />
                            {project.clearanceReportUrl ? "Replace report" : "Upload report"}
                          </span>
                        )}
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Clearance Invoice</label>
                      {project.clearanceInvoiceUrl ? (
                        <div className="flex items-center gap-2 mb-1">
                          <a
                            href={project.clearanceInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <FileCheck size={14} /> {project.clearanceInvoiceName || "View Invoice"}
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      ) : null}
                      <label
                        className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition py-3 ${
                          clearanceInvoiceFile ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                        }`}
                      >
                        <input
                          ref={clearanceInvoiceRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => setClearanceInvoiceFile(e.target.files?.[0] || null)}
                        />
                        {clearanceInvoiceFile ? (
                          <span className="text-xs text-emerald-700 font-medium">{clearanceInvoiceFile.name}</span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            <Upload size={14} className="inline mr-1" />
                            {project.clearanceInvoiceUrl ? "Replace invoice" : "Upload invoice"}
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleSaveClearance}
                      disabled={clearanceSaving}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {clearanceSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {clearanceSaving ? "Saving..." : "Save Clearance"}
                    </button>
                    {clearanceSaved && (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 size={14} /> Saved! Post-cost updated.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Feedback Survey / Google Review ─── */}
              <div className="border border-slate-200 rounded-xl bg-white">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Star size={16} className="text-yellow-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Feedback & Google Review</h3>
                  {reviewRequests.some((r) => r.reviewConfirmed) && (
                    <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">REVIEW CONFIRMED</span>
                  )}
                  {!reviewRequests.some((r) => r.reviewConfirmed) && reviewRequests.some((r) => r.rating && r.rating >= 4) && (
                    <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">HIGH RATING</span>
                  )}
                </div>
                <div className="px-5 py-4 space-y-4">
                  {/* Previous requests */}
                  {reviewRequests.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sent Surveys</p>
                      {reviewRequests.map((rr) => (
                        <div key={rr.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              rr.reviewConfirmed ? "bg-emerald-500" :
                              rr.rating ? (rr.rating >= 4 ? "bg-blue-500" : "bg-amber-500") :
                              rr.status === "sent" ? "bg-slate-400" : "bg-red-400"
                            }`} />
                            <span className="text-xs text-slate-600 truncate">
                              {rr.clientName || "Client"} &middot; {rr.touchesSent || 1}/3 touches
                            </span>
                            {rr.sentAt && (
                              <span className="text-[10px] text-slate-400 flex-shrink-0">
                                {new Date(rr.sentAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {rr.rating && (
                              <span className="flex items-center gap-0.5 text-xs">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} size={10} className={i < rr.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200"} />
                                ))}
                              </span>
                            )}
                            {rr.reviewConfirmed ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Reviewed</span>
                            ) : rr.googleReviewClicked ? (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Clicked</span>
                            ) : rr.feedbackComment ? (
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded" title={rr.feedbackComment}>
                                <MessageSquare size={10} className="inline" /> Feedback
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Send new survey form */}
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Send Feedback Survey</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Client Email</label>
                        <input
                          type="email"
                          value={reviewEmail}
                          onChange={(e) => setReviewEmail(e.target.value)}
                          placeholder="client@example.com"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Client Phone</label>
                        <input
                          type="tel"
                          value={reviewPhone}
                          onChange={(e) => setReviewPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Send Via</label>
                        <select
                          value={reviewMethod}
                          onChange={(e) => setReviewMethod(e.target.value as any)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        >
                          <option value="both">Email & SMS</option>
                          <option value="email">Email Only</option>
                          <option value="sms">SMS Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Google Location</label>
                        <select
                          value={reviewLocationKey}
                          onChange={(e) => setReviewLocationKey(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        >
                          {reviewLocations.length > 0 ? (
                            reviewLocations.map((loc) => (
                              <option key={loc.key} value={loc.key}>{loc.name}</option>
                            ))
                          ) : (
                            <>
                              <option value="front_range">Front Range</option>
                              <option value="western_slope">Western Slope</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={handleSendReview}
                      disabled={reviewSending || (!reviewEmail && reviewMethod !== "sms") || (!reviewPhone && reviewMethod !== "email")}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
                    >
                      {reviewSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {reviewSending ? "Sending..." : "Send Feedback Survey"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───── Meth Decon Report (METH projects only) ───── */}
      {tab === "decon_report" && (
        <MethDeconReportSection
          projectId={project.id}
          projectType={project.type}
          projectName={project.name}
          projectAddress={project.address || ""}
        />
      )}

      {/* ───── Documents (Permits, Sampling Reports, etc.) ───── */}
      {tab === "documents" && (
        <DocumentsTab documents={projectDocuments} projectId={project.id} />
      )}

      {tab === "activity" && (
        <ActivityFeed
          parentType="project"
          parentId={project.id}
          activities={activities || []}
          linkedActivities={linkedActivities || []}
        />
      )}

      {tab === "inventory" && (
        <ContentInventoryTab projectId={project.id} />
      )}

      {tab === "notes" && (
        <NotesTab entityType="project" entityId={project.id} />
      )}

      {tab === "budget" && (
        <ProjectBudgetTab projectId={project.id} />
      )}

      {/* Upload Document Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setUploadModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">
                {uploadModal === "permit" ? "Upload Project Permit" : "Upload Sampling Report"}
              </h3>
              <button onClick={() => setUploadModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* File picker */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">File</label>
                <label
                  className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition py-4 ${
                    uploadFile ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                  }`}
                >
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setUploadFile(file);
                      if (file && !uploadTitle) {
                        setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                  />
                  {uploadFile ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <FileCheck size={16} />
                      <span className="font-medium">{uploadFile.name}</span>
                      <span className="text-[10px] text-emerald-500">({(uploadFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <Upload size={20} />
                      <span className="text-xs">Click to select a file</span>
                      <span className="text-[10px]">PDF, DOC, JPG, PNG, TIFF</span>
                    </div>
                  )}
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder={uploadModal === "permit" ? "e.g. CDPHE Asbestos Permit" : "e.g. Initial Asbestos Sampling Report"}
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {uploadModal === "permit" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Permit Number</label>
                    <input
                      value={uploadRef}
                      onChange={(e) => setUploadRef(e.target.value)}
                      placeholder="e.g. CDPHE-2026-1234"
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Project Start Date</label>
                      <input
                        type="date"
                        value={uploadStartDate}
                        onChange={(e) => setUploadStartDate(e.target.value)}
                        className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Project End Date</label>
                      <input
                        type="date"
                        value={uploadEndDate}
                        onChange={(e) => setUploadEndDate(e.target.value)}
                        className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <input
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setUploadModal(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadDocument}
                  disabled={uploadSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploadSaving ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploadModal === "permit" ? "Save Permit" : "Save Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onComplete={async (taskId) => {
            await fetch(`/api/tasks/${taskId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "completed" }),
            });
            router.refresh();
            setSelectedTask(null);
          }}
          onStatusChange={async (taskId, status) => {
            await fetch(`/api/tasks/${taskId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status }),
            });
            router.refresh();
            setSelectedTask(null);
          }}
        />
      )}

      {/* ─── Quick Add FAB ───────────────────────────────────── */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40" ref={quickAddRef}>
        {/* Menu items */}
        {quickAddOpen && (
          <div className="mb-3 flex flex-col items-end gap-1.5">
            {[
              { label: "Field Report", href: `/field-reports/new?projectId=${project.id}`, icon: ClipboardList, color: "text-indigo-600 bg-indigo-50" },
              { label: "Time Report", href: "/time-clock", icon: Clock, color: "text-blue-600 bg-blue-50" },
              { label: "PSI / JHA / SPA", href: `/psi-jha-spa/new?projectId=${project.id}`, icon: Shield, color: "text-amber-600 bg-amber-50" },
              { label: "Pre-Abatement", href: `/pre-abatement-inspection/new?projectId=${project.id}`, icon: CheckSquare, color: "text-emerald-600 bg-emerald-50" },
              { label: "Certificate of Completion", href: `/certificate-of-completion/new?projectId=${project.id}`, icon: Award, color: "text-purple-600 bg-purple-50" },
              { label: "Post-Project Inspection", href: `/post-project-inspection/new?projectId=${project.id}`, icon: FileCheck, color: "text-teal-600 bg-teal-50" },
            ].map((item) => {
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setQuickAddOpen(false)}
                  className="flex items-center gap-2.5 pl-3 pr-4 py-2 bg-white rounded-full shadow-md border border-slate-200 hover:shadow-lg transition-all group"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${item.color}`}>
                    <ItemIcon size={13} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 whitespace-nowrap group-hover:text-slate-900">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => { setQuickAddOpen(false); setQuickNoteOpen(true); }}
              className="flex items-center gap-2.5 pl-3 pr-4 py-2 bg-white rounded-full shadow-md border border-slate-200 hover:shadow-lg transition-all group"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 bg-slate-100">
                <Activity size={13} />
              </div>
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap group-hover:text-slate-900">Activity Note</span>
            </button>
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={() => setQuickAddOpen(!quickAddOpen)}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
            quickAddOpen
              ? "bg-slate-700 hover:bg-slate-800 rotate-45"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          <Plus size={22} className="text-white transition-transform" />
        </button>
      </div>

      {/* ─── Quick Activity Note Modal ───────────────────────── */}
      {quickNoteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setQuickNoteOpen(false)}>
          <div className="bg-white w-full md:w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Quick Note</h3>
              <button onClick={() => setQuickNoteOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <select
                value={quickNoteType}
                onChange={(e) => setQuickNoteType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="site_visit">Site Visit</option>
                <option value="meeting">Meeting</option>
              </select>
              <textarea
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                placeholder="What happened?"
                rows={3}
                autoFocus
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
              />
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setQuickNoteOpen(false)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={handleQuickNote}
                disabled={!quickNoteText.trim() || quickNoteSaving}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition"
              >
                {quickNoteSaving ? "Saving..." : "Add Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── PSI / JHA / SPA Sub-Tab ───── */
function PsiTab({ entries, projectId }: { entries: PsiJhaSpaEntry[]; projectId: string }) {
  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    reviewed: "bg-green-100 text-green-800",
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
        <Shield size={36} className="mx-auto text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-700">No PSI/JHA/SPA forms yet</h3>
        <p className="text-sm text-slate-500 mt-1">Create the first pre-shift safety form for this project.</p>
        <Link href={`/psi-jha-spa/new?projectId=${projectId}`}
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">
          <Plus size={16} /> New PSI / JHA / SPA
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Link href={`/psi-jha-spa/new?projectId=${projectId}`}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
          <Plus size={16} /> New PSI / JHA / SPA
        </Link>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Date</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Time</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Supervisor</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Steps</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Max Risk</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((item) => {
              const maxRisk = item.taskSteps?.length
                ? Math.max(...item.taskSteps.map((s: any) => s.riskRating || 0))
                : 0;
              const riskColor = maxRisk >= 8 ? "bg-red-100 text-red-700" : maxRisk >= 6 ? "bg-orange-100 text-orange-700" : maxRisk === 5 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900 whitespace-nowrap">
                    {new Date(item.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{item.time || "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{item.supervisorName || "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{item.taskSteps?.length || 0}</td>
                  <td className="px-4 py-2">
                    {maxRisk > 0 ? <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${riskColor}`}>{maxRisk}</span> : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[item.status] || "bg-slate-100"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/psi-jha-spa/${item.id}`} className="text-slate-400 hover:text-indigo-600">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───── Time Reports Sub-Tab ───── */
function TimeReportsTab({ entries, projectId }: { entries: TimeEntry[]; projectId: string }) {
  // Group entries by date
  const dateGroups = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    if (!dateGroups.has(e.date)) dateGroups.set(e.date, []);
    dateGroups.get(e.date)!.push(e);
  }
  const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => b.localeCompare(a));

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
        <Clock size={36} className="mx-auto text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-700">No time entries yet</h3>
        <p className="text-sm text-slate-500 mt-1">Clock in workers from the Time Clock page.</p>
        <Link
          href="/time-clock"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg"
        >
          <Clock size={16} /> Go to Time Clock
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/time-clock"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Clock size={16} />
          Open Time Clock
        </Link>
      </div>

      {sortedDates.map((date) => {
        const dayEntries = dateGroups.get(date)!;
        const supHrs = dayEntries.filter((e) => e.role === "supervisor").reduce((s, e) => s + (e.totalHours || 0), 0);
        const techHrs = dayEntries.filter((e) => e.role === "technician").reduce((s, e) => s + (e.totalHours || 0), 0);
        const openCount = dayEntries.filter((e) => !e.clockOut).length;

        return (
          <div key={date} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-800">
                  {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </span>
                <span className="text-xs text-slate-500">{dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}</span>
                {openCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                    {openCount} active
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 flex gap-4">
                <span>Sup: <strong className="text-indigo-600">{supHrs.toFixed(1)}h</strong></span>
                <span>Tech: <strong className="text-slate-800">{techHrs.toFixed(1)}h</strong></span>
                <span>Total: <strong className="text-slate-900">{(supHrs + techHrs).toFixed(1)}h</strong></span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Worker</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Role</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">In</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Out</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Break</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Hours</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dayEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{entry.workerName}</td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        entry.role === "supervisor" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {entry.role === "supervisor" ? "SUP" : "TECH"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{formatTime(entry.clockIn)}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {entry.clockOut ? formatTime(entry.clockOut) : (
                        <span className="text-emerald-600 text-xs font-medium">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{entry.breakMinutes > 0 ? `${entry.breakMinutes}m` : "—"}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {entry.totalHours != null ? `${entry.totalHours.toFixed(1)}h` : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-500 max-w-[180px] truncate">{entry.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/* ───── Pre-Abatement Inspection Sub-Tab ───── */
function PreAbatementTab({ entries, projectId }: { entries: PreAbatementEntry[]; projectId: string }) {
  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    reviewed: "bg-green-100 text-green-800",
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
        <CheckSquare size={36} className="mx-auto text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-700">No pre-abatement inspections yet</h3>
        <p className="text-sm text-slate-500 mt-1">Create an inspection checklist before work begins.</p>
        <Link href={`/pre-abatement-inspection/new?projectId=${projectId}`}
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">
          <Plus size={16} /> New Inspection
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Link href={`/pre-abatement-inspection/new?projectId=${projectId}`}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
          <Plus size={16} /> New Inspection
        </Link>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Date</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Inspector</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Results</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((item) => {
              const items = item.checklistItems || {};
              const yesCount = Object.values(items).filter((v) => v === "yes").length;
              const noCount = Object.values(items).filter((v) => v === "no").length;
              const total = Object.keys(items).length;
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900 whitespace-nowrap">
                    {new Date(item.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{item.inspector || "—"}</td>
                  <td className="px-4 py-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">{yesCount} yes</span>
                    {noCount > 0 && <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">{noCount} no</span>}
                    <span className="ml-1 text-[10px] text-slate-400">/ {total}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[item.status] || "bg-slate-100"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/pre-abatement-inspection/${item.id}`} className="text-slate-400 hover:text-indigo-600">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───── Certificates of Completion Sub-Tab ───── */
function CertsTab({ entries, projectId }: { entries: CertEntry[]; projectId: string }) {
  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    signed: "bg-green-100 text-green-800",
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
        <Award size={36} className="mx-auto text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-700">No certificates of completion yet</h3>
        <p className="text-sm text-slate-500 mt-1">Create a certificate when work is complete for property owner sign-off.</p>
        <Link href={`/certificate-of-completion/new?projectId=${projectId}`}
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">
          <Plus size={16} /> New Certificate
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Link href={`/certificate-of-completion/new?projectId=${projectId}`}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
          <Plus size={16} /> New Certificate
        </Link>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Demobilization Date</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Property Owner</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-900 whitespace-nowrap">
                  {item.demobilizationDate
                    ? new Date(item.demobilizationDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </td>
                <td className="px-4 py-2 text-slate-600">{item.propertyOwnerName || "—"}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[item.status] || "bg-slate-100"}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/certificate-of-completion/${item.id}`} className="text-slate-400 hover:text-indigo-600">
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───── Post Project Inspection Sub-Tab ───── */
function PostProjectTab({ entries, projectId }: { entries: PostProjectEntry[]; projectId: string }) {
  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    reviewed: "bg-green-100 text-green-800",
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
        <ClipboardList size={36} className="mx-auto text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-700">No post-project inspections yet</h3>
        <p className="text-sm text-slate-500 mt-1">Complete a closeout inspection when the project wraps up.</p>
        <Link href={`/post-project-inspection/new?projectId=${projectId}`}
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">
          <Plus size={16} /> New Inspection
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Link href={`/post-project-inspection/new?projectId=${projectId}`}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
          <Plus size={16} /> New Inspection
        </Link>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Date</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Client</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Project Manager</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Results</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((item) => {
              const items = item.checklistItems || {};
              const yesCount = Object.values(items).filter((v) => v === "yes").length;
              const noCount = Object.values(items).filter((v) => v === "no").length;
              const total = Object.keys(items).length;
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900 whitespace-nowrap">
                    {item.inspectionDate
                      ? new Date(item.inspectionDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{item.clientName || "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{item.projectManagerName || "—"}</td>
                  <td className="px-4 py-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">{yesCount} yes</span>
                    {noCount > 0 && <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">{noCount} no</span>}
                    <span className="ml-1 text-[10px] text-slate-400">/ {total}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[item.status] || "bg-slate-100"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/post-project-inspection/${item.id}`} className="text-slate-400 hover:text-indigo-600">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───── Documents Sub-Tab ───── */
function DocumentsTab({ documents, projectId }: { documents: DocEntry[]; projectId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docType, setDocType] = useState("state_permit");
  const [title, setTitle] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("pending");
  const router = useRouter();

  const DOC_TYPE_OPTIONS = [
    { value: "state_permit", label: "State Permit" },
    { value: "initial_sampling", label: "Initial Sampling Report" },
    { value: "air_monitoring", label: "Air Monitoring Report" },
    { value: "waste_manifest", label: "Waste Manifest" },
    { value: "other", label: "Other" },
  ];

  const DOC_STATUS_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "received", label: "Received" },
    { value: "approved", label: "Approved" },
    { value: "expired", label: "Expired" },
  ];

  const typeLabels: Record<string, string> = Object.fromEntries(DOC_TYPE_OPTIONS.map(o => [o.value, o.label]));
  const statusBadge: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    received: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    expired: "bg-red-100 text-red-800",
  };

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/projects/${projectId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType, title, referenceNumber, date, notes, status }),
    });
    setSaving(false);
    setShowForm(false);
    setTitle("");
    setReferenceNumber("");
    setDate("");
    setNotes("");
    setDocType("state_permit");
    setStatus("pending");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <FolderOpen size={16} className="text-indigo-500" /> Project Documents
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            <Plus size={14} /> Add Document
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-indigo-200 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                {DOC_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CDPHE Notification #12345"
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Reference Number</label>
              <input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Permit or report number"
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                {DOC_STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save Document
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
            >
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}

      {documents.length === 0 && !showForm ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <FolderOpen size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">No documents logged yet</p>
          <p className="text-xs text-slate-400 mt-1">Add state permits, sampling reports, and other project documents</p>
        </div>
      ) : documents.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-2 text-xs font-medium text-slate-500">Type</th>
                <th className="px-4 py-2 text-xs font-medium text-slate-500">Title</th>
                <th className="px-4 py-2 text-xs font-medium text-slate-500">Reference #</th>
                <th className="px-4 py-2 text-xs font-medium text-slate-500">Date</th>
                <th className="px-4 py-2 text-xs font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 text-xs font-medium text-slate-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-indigo-50 text-indigo-700">
                      {typeLabels[doc.docType] || doc.docType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{doc.title || "—"}</td>
                  <td className="px-4 py-2 text-slate-600 font-mono text-xs">{doc.referenceNumber || "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{doc.date ? formatDate(new Date(doc.date)) : "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusBadge[doc.status] || "bg-slate-100"}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate">{doc.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ───── Progress Ring SVG ───── */
function ProgressRing({ percent, size = 140, stroke = 10, color }: { percent: number; size?: number; stroke?: number; color: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#e2e8f0" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

function getProgressColor(percent: number): string {
  if (percent > 100) return "#ef4444"; // red — over budget/time
  if (percent >= 85) return "#f59e0b";  // amber — approaching limit
  return "#22c55e";                     // green — on track
}

/* ───── Dashboard Sub-Tab ───── */
function DashboardTab({
  project,
  timeEntries,
  fieldReports,
  tasksDone,
  tasksTotal,
  psiCount,
  preAbatementCount,
  certsCount,
  projectDocuments = [],
  linkedTasks = [],
  projectCoordinatorId = null,
  incidents = [],
  scheduleEntries = [],
  invoices = [],
  allWorkers = [],
  postProjectInspections = [],
}: {
  project: any;
  timeEntries: TimeEntry[];
  fieldReports: FieldReport[];
  tasksDone: number;
  tasksTotal: number;
  psiCount: number;
  preAbatementCount: number;
  certsCount: number;
  projectDocuments?: DocEntry[];
  linkedTasks?: LinkedTask[];
  projectCoordinatorId?: string | null;
  incidents?: any[];
  scheduleEntries?: any[];
  invoices?: any[];
  allWorkers?: any[];
  postProjectInspections?: PostProjectEntry[];
}) {
  const [editingDays, setEditingDays] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [estDays, setEstDays] = useState<string>(project.estimatedDays?.toString() || "");
  const [estHours, setEstHours] = useState<string>(project.estimatedLaborHours?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [creatingPermitMod, setCreatingPermitMod] = useState(false);
  const [editingEndDate, setEditingEndDate] = useState(false);
  const [newEndDate, setNewEndDate] = useState(project.estEndDate || "");
  const [incidentModal, setIncidentModal] = useState(false);
  const [incidentSaving, setIncidentSaving] = useState(false);
  const [incidentType, setIncidentType] = useState("work_stoppage");
  const [incidentSeverity, setIncidentSeverity] = useState("medium");
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [incidentTime, setIncidentTime] = useState(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
  const [incidentReporter, setIncidentReporter] = useState("");
  const router = useRouter();

  // Calculate elapsed days
  const startDate = project.startDate ? new Date(project.startDate) : null;
  const today = new Date();
  let elapsedDays = 0;
  if (startDate) {
    const diffMs = today.getTime() - startDate.getTime();
    elapsedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Calculate total labor hours from time entries
  const totalLaborHours = timeEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
  const supervisorHours = timeEntries.filter(e => e.role === "supervisor").reduce((sum, e) => sum + (e.totalHours || 0), 0);
  const technicianHours = timeEntries.filter(e => e.role === "technician").reduce((sum, e) => sum + (e.totalHours || 0), 0);
  const laborerHours = totalLaborHours - supervisorHours - technicianHours;

  const estimatedDays = project.estimatedDays || 0;
  const estimatedHours = project.estimatedLaborHours || 0;

  const daysPercent = estimatedDays > 0 ? (elapsedDays / estimatedDays) * 100 : 0;
  const hoursPercent = estimatedHours > 0 ? (totalLaborHours / estimatedHours) * 100 : 0;

  const taskPercent = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  // Unique workers on the clock
  const uniqueWorkers = new Set(timeEntries.map(e => e.workerId)).size;

  // Permit dates
  const permitDoc = projectDocuments.find(d => d.docType === "state_permit");
  const permitStartDate = permitDoc?.startDate || null;
  const permitEndDate = permitDoc?.endDate || null;
  const todayStr = new Date().toISOString().split("T")[0];
  const isPermitExpired = permitEndDate ? todayStr > permitEndDate : false;
  const hasPermitModTask = linkedTasks.some(t => t.title.includes("Permit Mod") && t.status !== "completed");

  // Incidents
  const openIncidents = incidents.filter((i: any) => i.status === "open");
  const criticalIncidents = incidents.filter((i: any) => i.severity === "critical");

  // Tasks breakdown
  const openTasksArr = linkedTasks.filter(t => t.status !== "completed");
  const overdueTasksArr = openTasksArr.filter(t => t.dueDate && t.dueDate < todayStr);
  const highPriorityTasks = openTasksArr.filter(t => t.priority === "urgent" || t.priority === "high");

  // Invoice totals for this project
  const projectInvoiceTotal = invoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
  const paidInvoiceTotal = invoices.filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + (i.total || 0), 0);

  // Scheduled workers
  const scheduledWorkerIds = new Set(scheduleEntries.map((e: any) => e.workerId));
  const scheduledWorkerNames = allWorkers.filter((w: any) => scheduledWorkerIds.has(w.id)).map((w: any) => w.name);

  // Document completeness
  const docCount = projectDocuments.length;
  const samplingDoc = projectDocuments.find(d => d.docType === "initial_sampling");

  async function handleCreatePermitModTask() {
    setCreatingPermitMod(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Permit Mod Required — ${project.name}`,
        description: `The project has exceeded its permitted end date (${permitEndDate}). A permit modification is required.\n\nProject: ${project.name}\nAddress: ${project.address}\nProject #: ${project.projectNumber}`,
        status: "to_do",
        priority: "urgent",
        dueDate: todayStr,
        assignedTo: projectCoordinatorId || project.projectManagerId || null,
        linkedEntityType: "project",
        linkedEntityId: project.id,
        autoCreated: true,
      }),
    });
    setCreatingPermitMod(false);
    router.refresh();
  }

  async function handleUpdateEndDate() {
    if (!newEndDate) return;
    setSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estEndDate: newEndDate }),
    });
    setEditingEndDate(false);
    setSaving(false);
    router.refresh();
  }

  async function saveEstimate(field: "estimatedDays" | "estimatedLaborHours", value: string) {
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value ? Number(value) : null }),
      });
      router.refresh();
    } finally {
      setSaving(false);
      if (field === "estimatedDays") setEditingDays(false);
      else setEditingHours(false);
    }
  }

  async function handleReportIncident() {
    if (!incidentTitle.trim()) return;
    setIncidentSaving(true);
    try {
      await fetch(`/api/projects/${project.id}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: incidentType,
          severity: incidentSeverity,
          title: incidentTitle,
          description: incidentDesc,
          date: incidentDate,
          time: incidentTime,
          reportedBy: incidentReporter,
        }),
      });
      setIncidentModal(false);
      setIncidentType("work_stoppage");
      setIncidentSeverity("medium");
      setIncidentTitle("");
      setIncidentDesc("");
      setIncidentReporter("");
      router.refresh();
    } finally {
      setIncidentSaving(false);
    }
  }

  const INCIDENT_TYPES = [
    { value: "work_stoppage", label: "Work Stoppage" },
    { value: "state_inspection", label: "State Inspection" },
    { value: "injury", label: "Injury" },
    { value: "project_mishap", label: "Project Mishap" },
    { value: "equipment_failure", label: "Equipment Failure" },
    { value: "environmental", label: "Environmental" },
    { value: "other", label: "Other" },
  ];

  const SEVERITY_OPTIONS = [
    { value: "low", label: "Low", color: "bg-slate-100 text-slate-700" },
    { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-700" },
    { value: "high", label: "High", color: "bg-orange-100 text-orange-700" },
    { value: "critical", label: "Critical", color: "bg-red-100 text-red-700" },
  ];

  const INCIDENT_TYPE_LABELS: Record<string, string> = {
    work_stoppage: "Work Stoppage", state_inspection: "State Inspection", injury: "Injury",
    project_mishap: "Mishap", equipment_failure: "Equipment", environmental: "Environmental", other: "Other",
  };

  return (
    <div className="space-y-5">
      {/* Incident Report Modal */}
      {incidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-red-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-500" /> Report Incident
              </h3>
              <button onClick={() => setIncidentModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Incident Type</label>
                <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                  {INCIDENT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Severity</label>
                <div className="flex gap-2">
                  {SEVERITY_OPTIONS.map((s) => (
                    <button key={s.value} onClick={() => setIncidentSeverity(s.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${incidentSeverity === s.value ? `${s.color} border-current ring-1 ring-current` : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                <input type="text" value={incidentTitle} onChange={(e) => setIncidentTitle(e.target.value)}
                  placeholder="Brief description of the incident" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Details about what happened..." rows={3} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Time</label>
                  <input type="time" value={incidentTime} onChange={(e) => setIncidentTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reported By</label>
                <input type="text" value={incidentReporter} onChange={(e) => setIncidentReporter(e.target.value)}
                  placeholder="Name of person reporting" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setIncidentModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition">Cancel</button>
              <button onClick={handleReportIncident} disabled={incidentSaving || !incidentTitle.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-2">
                {incidentSaving ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                Submit Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Report Incident Button (top) === */}
      <div className="flex justify-end">
        <button
          onClick={() => setIncidentModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm transition"
        >
          <ShieldAlert size={13} />
          Report Incident
        </button>
      </div>

      {/* === Alerts Banner === */}
      {(isPermitExpired || openIncidents.length > 0 || overdueTasksArr.length > 0) && (
        <div className={`rounded-lg border p-4 ${criticalIncidents.length > 0 || isPermitExpired ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className={criticalIncidents.length > 0 || isPermitExpired ? "text-red-600" : "text-amber-600"} />
            <span className={`text-sm font-bold ${criticalIncidents.length > 0 || isPermitExpired ? "text-red-800" : "text-amber-800"}`}>Needs Attention</span>
          </div>
          <div className="space-y-2">
            {isPermitExpired && project.status === "in_progress" && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-700 font-medium">Permit has exceeded its end date ({permitEndDate ? new Date(permitEndDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""})</span>
                <div className="flex items-center gap-2">
                  {!hasPermitModTask ? (
                    <button onClick={handleCreatePermitModTask} disabled={creatingPermitMod}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition">
                      {creatingPermitMod ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />} Create Permit Mod
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-red-600 bg-red-100 rounded-md">
                      <CheckCircle2 size={10} /> Permit Mod created
                    </span>
                  )}
                  {!editingEndDate ? (
                    <button onClick={() => setEditingEndDate(true)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition">
                      <Pencil size={10} /> Update End Date
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500" />
                      <button onClick={handleUpdateEndDate} disabled={saving} className="text-emerald-600 hover:text-emerald-700 transition"><Save size={14} /></button>
                      <button onClick={() => { setEditingEndDate(false); setNewEndDate(project.estEndDate || ""); }} className="text-slate-400 hover:text-red-500 transition"><X size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {openIncidents.length > 0 && (
              <div className="text-xs text-red-700 font-medium">{openIncidents.length} open incident{openIncidents.length > 1 ? "s" : ""} — {openIncidents.map((i: any) => INCIDENT_TYPE_LABELS[i.type] || i.type).join(", ")}</div>
            )}
            {overdueTasksArr.length > 0 && (
              <div className="text-xs text-orange-700 font-medium">{overdueTasksArr.length} overdue task{overdueTasksArr.length > 1 ? "s" : ""}</div>
            )}
          </div>
        </div>
      )}

      {/* === Permit & Schedule Info Bar === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Permit Info */}
        <div className={`rounded-lg border p-4 ${isPermitExpired ? "bg-red-50/50 border-red-200" : "bg-white border-slate-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className={isPermitExpired ? "text-red-500" : "text-indigo-500"} />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Permit</span>
          </div>
          {permitDoc ? (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Start</span><span className="font-medium text-slate-800">{permitStartDate ? new Date(permitStartDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">End</span><span className={`font-medium ${isPermitExpired ? "text-red-600" : "text-slate-800"}`}>{permitEndDate ? new Date(permitEndDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span></div>
              {permitDoc.referenceNumber && <div className="flex justify-between"><span className="text-slate-500">Permit #</span><span className="font-mono text-[11px] text-slate-700">{permitDoc.referenceNumber}</span></div>}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No permit uploaded</p>
          )}
        </div>

        {/* Crew & Schedule */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-indigo-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Crew</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Workers Logged</span><span className="font-medium text-slate-800">{uniqueWorkers}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Scheduled</span><span className="font-medium text-slate-800">{scheduledWorkerIds.size}</span></div>
            {scheduledWorkerNames.length > 0 && (
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{scheduledWorkerNames.join(", ")}</div>
            )}
          </div>
        </div>
      </div>

      {/* === Project Design (Asbestos Only) === */}
      {hasProjectType(project.type, "ASBESTOS") && (
        <ProjectDesignSlot projectId={project.id} projectDocuments={projectDocuments} />
      )}

      {/* === Progress Meters === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Days Progress */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
              <CalendarDays size={14} className="text-indigo-500" /> Days Progress
            </h3>
            {!editingDays ? (
              <button onClick={() => setEditingDays(true)} className="text-slate-400 hover:text-indigo-600 transition" title="Edit estimate"><Pencil size={12} /></button>
            ) : (
              <div className="flex items-center gap-1">
                <input type="number" min="0" value={estDays} onChange={(e) => setEstDays(e.target.value)} className="w-16 px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500" placeholder="Days" autoFocus />
                <button onClick={() => saveEstimate("estimatedDays", estDays)} disabled={saving} className="text-emerald-600 hover:text-emerald-700 transition"><Save size={12} /></button>
                <button onClick={() => { setEditingDays(false); setEstDays(project.estimatedDays?.toString() || ""); }} className="text-slate-400 hover:text-red-500 transition"><X size={12} /></button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <ProgressRing percent={daysPercent} color={getProgressColor(daysPercent)} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-900">{estimatedDays > 0 ? Math.round(daysPercent) : "—"}</span>
                {estimatedDays > 0 && <span className="text-[9px] text-slate-500 font-medium">percent</span>}
              </div>
            </div>
            <div className="flex-1 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Elapsed</span><span className="font-semibold text-slate-800">{elapsedDays} days</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Estimated</span><span className="font-semibold text-slate-800">{estimatedDays > 0 ? `${estimatedDays} days` : "Not set"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Remaining</span><span className={`font-semibold ${estimatedDays > 0 && elapsedDays > estimatedDays ? "text-red-600" : "text-slate-800"}`}>{estimatedDays > 0 ? `${Math.max(0, estimatedDays - elapsedDays)} days` : "—"}</span></div>
              {estimatedDays > 0 && elapsedDays > estimatedDays && (
                <div className="text-[11px] text-red-600 font-medium flex items-center gap-1 pt-0.5"><AlertTriangle size={10} /> Over by {elapsedDays - estimatedDays} days</div>
              )}
            </div>
          </div>
        </div>

        {/* Labor Hours Progress */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
              <Clock size={14} className="text-indigo-500" /> Labor Hours
            </h3>
            {!editingHours ? (
              <button onClick={() => setEditingHours(true)} className="text-slate-400 hover:text-indigo-600 transition" title="Edit estimate"><Pencil size={12} /></button>
            ) : (
              <div className="flex items-center gap-1">
                <input type="number" min="0" value={estHours} onChange={(e) => setEstHours(e.target.value)} className="w-16 px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500" placeholder="Hours" autoFocus />
                <button onClick={() => saveEstimate("estimatedLaborHours", estHours)} disabled={saving} className="text-emerald-600 hover:text-emerald-700 transition"><Save size={12} /></button>
                <button onClick={() => { setEditingHours(false); setEstHours(project.estimatedLaborHours?.toString() || ""); }} className="text-slate-400 hover:text-red-500 transition"><X size={12} /></button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <ProgressRing percent={hoursPercent} color={getProgressColor(hoursPercent)} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-900">{estimatedHours > 0 ? Math.round(hoursPercent) : "—"}</span>
                {estimatedHours > 0 && <span className="text-[9px] text-slate-500 font-medium">percent</span>}
              </div>
            </div>
            <div className="flex-1 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Logged</span><span className="font-semibold text-slate-800">{totalLaborHours.toFixed(1)} hrs</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Estimated</span><span className="font-semibold text-slate-800">{estimatedHours > 0 ? `${estimatedHours} hrs` : "Not set"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Remaining</span><span className={`font-semibold ${estimatedHours > 0 && totalLaborHours > estimatedHours ? "text-red-600" : "text-slate-800"}`}>{estimatedHours > 0 ? `${Math.max(0, estimatedHours - totalLaborHours).toFixed(1)} hrs` : "—"}</span></div>
              {estimatedHours > 0 && totalLaborHours > estimatedHours && (
                <div className="text-[11px] text-red-600 font-medium flex items-center gap-1 pt-0.5"><AlertTriangle size={10} /> Over by {(totalLaborHours - estimatedHours).toFixed(1)} hrs</div>
              )}
            </div>
          </div>
          {totalLaborHours > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex gap-4 text-[11px] text-slate-500">
              <span>Supervisor: <strong className="text-indigo-600">{supervisorHours.toFixed(1)}h</strong></span>
              <span>Technician: <strong className="text-slate-700">{technicianHours.toFixed(1)}h</strong></span>
              {laborerHours > 0.1 && <span>Laborer: <strong className="text-slate-700">{laborerHours.toFixed(1)}h</strong></span>}
            </div>
          )}
        </div>
      </div>

      {/* === Tasks + Safety + Financials Row === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tasks Summary */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={14} className="text-indigo-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tasks</span>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#6366f1" strokeWidth="3"
                  strokeDasharray={`${tasksTotal > 0 ? (tasksDone / tasksTotal) * 88 : 0} 88`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700">{taskPercent}%</div>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Done: <strong>{tasksDone}</strong></div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Open: <strong>{openTasksArr.length}</strong></div>
              {overdueTasksArr.length > 0 && <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Overdue: <strong className="text-red-600">{overdueTasksArr.length}</strong></div>}
            </div>
          </div>
          {highPriorityTasks.length > 0 && (
            <div className="border-t border-slate-100 pt-2 space-y-1">
              {highPriorityTasks.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-start gap-1.5 text-[11px]">
                  <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.priority === "urgent" ? "bg-red-500" : "bg-orange-400"}`} />
                  <span className="text-slate-700 line-clamp-1">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety & Documentation */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-emerald-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Safety & Docs</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Field Reports</span><span className="font-semibold text-slate-800">{fieldReports.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">PSI / JHA / SPA</span><span className="font-semibold text-slate-800">{psiCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pre-Abatement Insp.</span><span className="font-semibold text-slate-800">{preAbatementCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Certs of Completion</span><span className="font-semibold text-slate-800">{certsCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Post-Project Insp.</span><span className="font-semibold text-slate-800">{postProjectInspections.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Documents</span><span className="font-semibold text-slate-800">{docCount}</span></div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex gap-2 text-[10px]">
            <span className={`px-1.5 py-0.5 rounded ${permitDoc ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {permitDoc ? "Permit" : "No Permit"}
            </span>
            <span className={`px-1.5 py-0.5 rounded ${samplingDoc ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {samplingDoc ? "Sampling" : "No Sampling"}
            </span>
          </div>
        </div>

        {/* Incidents */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={14} className="text-red-400" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Incidents</span>
          </div>
          {incidents.length > 0 ? (
            <div className="flex gap-3 text-[11px]">
              <span className="text-slate-600">Total: <strong>{incidents.length}</strong></span>
              {openIncidents.length > 0 && <span className="text-red-600">Open: <strong>{openIncidents.length}</strong></span>}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No incidents reported</p>
          )}
        </div>
      </div>

    </div>
  );
}

// ── Project Design Upload Slot (Asbestos Only) ────────────────────
function ProjectDesignSlot({ projectId, projectDocuments }: { projectId: string; projectDocuments: DocEntry[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find existing project design document
  const designDoc = projectDocuments.find((d) => d.docType === "project_design");
  const designFileUrl = designDoc?.fileUrl || null;
  const designFileName = designDoc?.fileName || designDoc?.title || "Project Design";

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", "project_design");
      const res = await fetch(`/api/projects/${projectId}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    }
    setUploading(false);
  }

  async function handleDelete() {
    if (!designDoc) return;
    if (!confirm("Delete the project design document?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/projects/${projectId}/documents/${designDoc.id}`, { method: "DELETE" });
      router.refresh();
    } catch {
      alert("Delete failed");
    }
    setDeleting(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList size={14} className="text-indigo-500" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Project Design</span>
      </div>

      {designDoc ? (
        /* ── Uploaded State: show as link + delete button ── */
        <div className="flex items-center gap-2">
          {designFileUrl ? (
            <a
              href={designFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:underline font-medium truncate max-w-xs"
            >
              <FileText size={14} />
              <span className="truncate">{designFileName}</span>
              <ExternalLink size={11} className="flex-shrink-0 opacity-60" />
            </a>
          ) : (
            <span className="text-sm text-slate-600 flex items-center gap-1.5">
              <FileText size={14} />
              {designFileName}
            </span>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-1 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition flex-shrink-0"
            title="Remove project design"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
          </button>
        </div>
      ) : (
        /* ── Empty State: show upload dropzone ── */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff"
            className="hidden"
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-indigo-600">
              <Loader2 size={16} className="animate-spin" /> Uploading...
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload size={18} className="text-slate-300" />
              <span className="text-xs text-slate-500">
                Click or drop file to upload project design
              </span>
              <span className="text-[10px] text-slate-300">PDF, DOC, DOCX, JPG, PNG, TIFF</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
