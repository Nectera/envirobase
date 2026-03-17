"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, User, MapPin, DollarSign, Phone, Mail, MessageSquare, Calendar,
  FileText, ChevronRight, Check, X, ArrowLeft, Shield, ExternalLink, Send,
  PhoneCall, CheckCircle, Upload, Trash2, FlaskConical, File, Loader2, ShieldCheck,
  Clock, Briefcase, StickyNote, Hash, Pencil,
} from "lucide-react";
import ActivityFeed from "@/components/ActivityFeed";
import NotesTab from "@/components/NotesTab";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import EmailCompose from "@/components/EmailCompose";
import SMSCompose from "@/components/SMSCompose";
import ReferralSourcePicker from "@/components/ReferralSourcePicker";
import PandaDocSend from "@/components/PandaDocSend";
import TaskDetailModal from "@/components/TaskDetailModal";

const STAGES = ["new", "contacted", "site_visit", "proposal_sent", "negotiation", "won", "lost"];
const STAGE_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", site_visit: "Site Visit",
  proposal_sent: "Proposal Sent", negotiation: "Negotiation", won: "Won", lost: "Lost",
};
const STAGE_COLORS: Record<string, string> = {
  new: "bg-slate-200", contacted: "bg-blue-400", site_visit: "bg-amber-400",
  proposal_sent: "bg-purple-400", negotiation: "bg-indigo-400", won: "bg-emerald-500", lost: "bg-red-400",
};
const TYPE_BADGE: Record<string, string> = {
  ASBESTOS: "bg-indigo-100 text-indigo-700", LEAD: "bg-amber-100 text-amber-700",
  METH: "bg-red-100 text-red-700", MOLD: "bg-teal-100 text-teal-700",
  SELECT_DEMO: "bg-orange-100 text-orange-700", REBUILD: "bg-violet-100 text-violet-700",
  SELECT_DEMO_REBUILD: "bg-orange-100 text-orange-700",
};

function formatCurrency(val: number | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function LeadDetail({ lead, activities, linkedActivities = [], companies, contacts, linkedTasks = [], consultationEstimates = [], leadDocuments = [], fieldEstimators = [], linkedProjectClearance = null }: any) {
  const router = useRouter();
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [showSMSCompose, setShowSMSCompose] = useState(false);
  const [showPandaDoc, setShowPandaDoc] = useState(false);
  const [approvingEstimateId, setApprovingEstimateId] = useState<string | null>(null);
  const [showSiteVisitModal, setShowSiteVisitModal] = useState(false);
  const [siteVisitDate, setSiteVisitDate] = useState("");
  const [siteVisitTime, setSiteVisitTime] = useState("");
  const [siteVisitAssignee, setSiteVisitAssignee] = useState("");
  const [siteVisitSaving, setSiteVisitSaving] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [docUploadModal, setDocUploadModal] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docRef, setDocRef] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const openEditModal = () => {
    setEditForm({
      firstName: lead.firstName || "",
      lastName: lead.lastName || "",
      phone: lead.phone || "",
      email: lead.email || "",
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      zip: lead.zip || "",
      projectType: lead.projectType || "",
      source: lead.source || "",
      estimatedValue: lead.estimatedValue || "",
      notes: lead.notes || "",
      office: lead.office || "",
      isInsuranceJob: lead.isInsuranceJob || false,
      insuranceCarrier: lead.insuranceCarrier || "",
      claimNumber: lead.claimNumber || "",
      adjusterName: lead.adjusterName || "",
      adjusterPhone: lead.adjusterPhone || "",
      adjusterEmail: lead.adjusterEmail || "",
      dateOfLoss: lead.dateOfLoss || "",
      siteVisitDate: lead.siteVisitDate || "",
      siteVisitNotes: lead.siteVisitNotes || "",
      referralSource: lead.referralSource || "",
    });
    setShowEditModal(true);
  };

  const updateEdit = (field: string, value: any) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      const payload = {
        ...editForm,
        estimatedValue: editForm.estimatedValue ? Number(editForm.estimatedValue) : 0,
        dateOfLoss: editForm.dateOfLoss || null,
        siteVisitDate: editForm.siteVisitDate || null,
        siteVisitNotes: editForm.siteVisitNotes || null,
      };
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save changes");
        return;
      }
      setShowEditModal(false);
      router.refresh();
    } catch {
      alert("Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  };

  const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown";

  const handleDeleteLead = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/leads");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete lead");
      }
    } catch {
      alert("Failed to delete lead");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleApproveEstimate = async (estimateId: string) => {
    setApprovingEstimateId(estimateId);
    try {
      await fetch(`/api/consultation-estimates/${estimateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      router.refresh();
    } finally {
      setApprovingEstimateId(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "site_visit" && lead.status !== "site_visit" && !lead.siteVisitDate) {
      setShowSiteVisitModal(true);
      return;
    }

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === "won" ? { wonDate: new Date().toISOString().split("T")[0] } : {}),
          ...(newStatus === "lost" ? { lostDate: new Date().toISOString().split("T")[0] } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Error updating lead: ${err.error || res.statusText}`);
        return;
      }
    } catch (e: any) {
      alert(`Error updating lead: ${e.message}`);
      return;
    }
    router.refresh();
  };

  const handleSiteVisitSubmit = async () => {
    if (!siteVisitDate) return;
    setSiteVisitSaving(true);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "site_visit",
          siteVisitDate,
          siteVisitTime: siteVisitTime || null,
          siteVisitAssignee: siteVisitAssignee || null,
        }),
      });
      setShowSiteVisitModal(false);
      setSiteVisitDate("");
      setSiteVisitTime("");
      setSiteVisitAssignee("");
      router.refresh();
    } finally {
      setSiteVisitSaving(false);
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      router.refresh();
    } finally {
      setCompletingTaskId(null);
    }
  };

  const DOC_TYPES = [
    { value: "initial_sampling", label: "Sampling Report", icon: FlaskConical },
    { value: "state_permit", label: "Permit", icon: ShieldCheck },
    { value: "proposal", label: "Proposal", icon: FileText },
    { value: "contract", label: "Contract", icon: File },
    { value: "other", label: "Other Document", icon: File },
  ];

  const handleDocUpload = async () => {
    if (!docUploadModal) return;
    setDocSaving(true);
    try {
      const docTypeInfo = DOC_TYPES.find((d) => d.value === docUploadModal);
      await fetch(`/api/leads/${lead.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: docUploadModal,
          title: docTitle || docTypeInfo?.label || "Document",
          referenceNumber: docRef,
          notes: docNotes,
          fileName: docFile?.name || null,
          fileSize: docFile?.size || null,
          status: "received",
        }),
      });
      setDocUploadModal(null);
      setDocTitle("");
      setDocRef("");
      setDocNotes("");
      setDocFile(null);
      router.refresh();
    } finally {
      setDocSaving(false);
    }
  };

  const handleDocDelete = async (docId: string) => {
    await fetch(`/api/leads/${lead.id}/documents?docId=${docId}`, { method: "DELETE" });
    router.refresh();
  };

  const hasSamplingReport = leadDocuments.some((d: any) => d.docType === "initial_sampling");

  const activeStages = STAGES.filter((s) => s !== "lost");
  const currentIdx = activeStages.indexOf(lead.status);

  const fullAddress = [lead.address, lead.city, [lead.state, lead.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <div>
      {/* ─── Header Bar ─── */}
      <div className="mb-4">
        <Link href="/leads" className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-2">
          <ArrowLeft size={12} /> Back to Leads
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{leadName}</h1>
              {(lead.projectType || "").split(",").filter(Boolean).map((pt: string) => (
                <span key={pt} className={`text-[10px] font-semibold px-2 py-0.5 rounded ${TYPE_BADGE[pt.trim()] || "bg-slate-100"}`}>
                  {pt.trim()}
                </span>
              ))}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded text-white ${STAGE_COLORS[lead.status] || "bg-slate-400"}`}>
                {STAGE_LABELS[lead.status] || lead.status}
              </span>
              {lead.isInsuranceJob && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Insurance</span>
              )}
            </div>
            {lead.company && (
              <Link href={`/companies/${lead.company.id}`} className="text-sm text-slate-500 hover:text-indigo-600">
                {lead.company.name}
              </Link>
            )}
          </div>
          {/* Action buttons */}
          <div className="flex gap-1.5 flex-wrap">
            {lead.phone && (
              <a href={`tel:${lead.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <PhoneCall size={12} /> Call
              </a>
            )}
            {lead.phone && (
              <button onClick={() => setShowSMSCompose(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                <MessageSquare size={12} /> SMS
              </button>
            )}
            {lead.email && (
              <button onClick={() => setShowEmailCompose(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                <Send size={12} /> Email
              </button>
            )}
            {lead.email && (
              <button onClick={() => setShowPandaDoc(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition">
                <FileText size={12} /> Send Doc
              </button>
            )}
            <button onClick={openEditModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition">
              <Pencil size={12} /> Edit
            </button>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* ─── Status Progression ─── */}
      {lead.status !== "lost" && (
        <div className="bg-white rounded-lg border border-slate-200 p-3 mb-4">
          <div className="flex items-center gap-1">
            {activeStages.map((stage, i) => {
              const isActive = i <= currentIdx;
              const isCurrent = stage === lead.status;
              return (
                <button
                  key={stage}
                  onClick={() => handleStatusChange(stage)}
                  className={`flex-1 py-1.5 text-[11px] font-semibold rounded transition text-center ${
                    isCurrent
                      ? `${STAGE_COLORS[stage]} text-white`
                      : isActive
                      ? "bg-slate-200 text-slate-700"
                      : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </button>
              );
            })}
          </div>
          {lead.status !== "won" && lead.status !== "lost" && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleStatusChange("won")}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition">
                <Check size={12} /> Mark Won
              </button>
              <button onClick={() => handleStatusChange("lost")}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition">
                <X size={12} /> Mark Lost
              </button>
            </div>
          )}
        </div>
      )}

      {/* Won Banner */}
      {lead.status === "won" && lead.projectId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-emerald-800">Lead Won — Project Created</div>
            <div className="text-xs text-emerald-600 mt-0.5">A project file and contact were automatically created from this lead.</div>
          </div>
          <Link href={`/projects/${lead.projectId}`}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition">
            View Project
          </Link>
        </div>
      )}

      {/* Clearance Results (from linked project) */}
      {lead.status === "won" && linkedProjectClearance && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-emerald-600" />
            <h4 className="text-sm font-semibold text-slate-700">Air Clearance Results</h4>
            {linkedProjectClearance.clearanceResult === "pass" && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">PASS</span>
            )}
            {linkedProjectClearance.clearanceResult === "fail" && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">FAIL</span>
            )}
            {linkedProjectClearance.clearanceResult === "pending" && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">PENDING</span>
            )}
            <Link href={`/projects/${lead.projectId}`} className="ml-auto text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Edit in Project <ExternalLink size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {linkedProjectClearance.clearanceDate && (
              <div>
                <div className="text-xs text-slate-400">Date</div>
                <div className="text-slate-800">{formatDate(linkedProjectClearance.clearanceDate)}</div>
              </div>
            )}
            {linkedProjectClearance.clearanceVendor && (
              <div>
                <div className="text-xs text-slate-400">Vendor</div>
                <div className="text-slate-800">{linkedProjectClearance.clearanceVendor}</div>
              </div>
            )}
            {linkedProjectClearance.clearanceCost != null && (
              <div>
                <div className="text-xs text-slate-400">Cost</div>
                <div className="text-slate-800">{formatCurrency(linkedProjectClearance.clearanceCost)}</div>
              </div>
            )}
            {linkedProjectClearance.clearanceNotes && (
              <div className="col-span-2 sm:col-span-1">
                <div className="text-xs text-slate-400">Notes</div>
                <div className="text-slate-800 truncate">{linkedProjectClearance.clearanceNotes}</div>
              </div>
            )}
          </div>
          {(linkedProjectClearance.clearanceReportUrl || linkedProjectClearance.clearanceInvoiceUrl) && (
            <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
              {linkedProjectClearance.clearanceReportUrl && (
                <a href={linkedProjectClearance.clearanceReportUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <File size={12} /> {linkedProjectClearance.clearanceReportName || "View Report"}
                </a>
              )}
              {linkedProjectClearance.clearanceInvoiceUrl && (
                <a href={linkedProjectClearance.clearanceInvoiceUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <File size={12} /> {linkedProjectClearance.clearanceInvoiceName || "View Invoice"}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Info Strip: Contact + Property + Quick Info in one row ─── */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Contact Info */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Contact</h4>
            <div className="flex items-center gap-2">
              <User size={12} className="text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-800 font-medium">{leadName}</span>
            </div>
            {lead.phone && (
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-slate-400 flex-shrink-0" />
                <a href={`tel:${lead.phone}`} className="text-sm text-slate-700 hover:text-blue-600 transition">{lead.phone}</a>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700 truncate">{lead.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-600">
                {lead.office === "grand_junction" ? "Grand Junction (Western Slope)" : lead.office === "greeley" ? "Greeley (Front Range)" : lead.office || "—"}
              </span>
            </div>
            {lead.source && (
              <div className="flex items-center gap-2">
                <ExternalLink size={12} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-600 capitalize">{(lead.source || "").replace(/_/g, " ")}</span>
                {lead.referralSource && <span className="text-xs text-slate-400">({lead.referralSource})</span>}
              </div>
            )}
          </div>

          {/* Property / Location */}
          <div className="pt-3 md:pt-0 md:pl-4 space-y-1.5">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Property</h4>
            {fullAddress && (
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-800">{fullAddress}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <DollarSign size={12} className="text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-700">Est. Value: {formatCurrency(lead.estimatedValue)}</span>
            </div>
            {lead.locationNotes && (
              <div className="flex items-start gap-2">
                <StickyNote size={12} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-600">{lead.locationNotes}</span>
              </div>
            )}
            {lead.notes && (
              <div className="flex items-start gap-2">
                <FileText size={12} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-600 whitespace-pre-wrap">{lead.notes}</span>
              </div>
            )}
          </div>

          {/* Quick Info / Dates */}
          <div className="pt-3 md:pt-0 md:pl-4 space-y-1.5">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Details</h4>
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500">Created</span>
              <span className="text-sm text-slate-700 ml-auto">{formatDate(lead.createdAt)}</span>
            </div>
            {lead.wonDate && (
              <div className="flex items-center gap-2">
                <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-slate-500">Won</span>
                <span className="text-sm text-emerald-600 font-medium ml-auto">{formatDate(lead.wonDate)}</span>
              </div>
            )}
            {lead.lostDate && (
              <div className="flex items-center gap-2">
                <X size={12} className="text-red-500 flex-shrink-0" />
                <span className="text-xs text-slate-500">Lost</span>
                <span className="text-sm text-red-600 font-medium ml-auto">{formatDate(lead.lostDate)}</span>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center gap-2">
                <Building2 size={12} className="text-slate-400 flex-shrink-0" />
                <Link href={`/companies/${lead.company.id}`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium truncate">
                  {lead.company.name}
                </Link>
              </div>
            )}
            {lead.contact && (
              <div className="flex items-center gap-2">
                <User size={12} className="text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-slate-700 truncate">{[lead.contact.firstName, lead.contact.lastName].filter(Boolean).join(" ") || lead.contact.name}</div>
                  {lead.contact.title && <div className="text-[10px] text-slate-400">{lead.contact.title}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Site Visit Schedule Banner ─── */}
      {(lead.siteVisitDate || lead.siteVisitTime) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center gap-4">
          <Calendar size={16} className="text-amber-600 flex-shrink-0" />
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold text-amber-800">Site Visit</span>
            {lead.siteVisitDate && <span className="text-slate-700">{formatDate(lead.siteVisitDate)}</span>}
            {lead.siteVisitTime && <span className="text-slate-500">at {lead.siteVisitTime}</span>}
          </div>
          {lead.siteVisitNotes && <span className="text-xs text-slate-500 ml-auto">{lead.siteVisitNotes}</span>}
        </div>
      )}

      {/* ─── Insurance Banner ─── */}
      {lead.isInsuranceJob && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={13} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Insurance</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            {lead.insuranceCarrier && (
              <div><span className="text-[10px] text-slate-400 block">Carrier</span><span className="text-slate-700">{lead.insuranceCarrier}</span></div>
            )}
            {lead.claimNumber && (
              <div><span className="text-[10px] text-slate-400 block">Claim #</span><span className="text-slate-700">{lead.claimNumber}</span></div>
            )}
            {lead.adjusterName && (
              <div><span className="text-[10px] text-slate-400 block">Adjuster</span><span className="text-slate-700">{lead.adjusterName}</span></div>
            )}
            {lead.dateOfLoss && (
              <div><span className="text-[10px] text-slate-400 block">Date of Loss</span><span className="text-slate-700">{formatDate(lead.dateOfLoss)}</span></div>
            )}
          </div>
        </div>
      )}

      {/* ─── Testing Referral Banner ─── */}
      {lead.referredForTesting && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center gap-3">
          <ExternalLink size={14} className="text-amber-600 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-amber-800">Referred for Testing</span>
            {lead.referredTestingTo && <span className="text-slate-600 ml-2">— {lead.referredTestingTo}</span>}
          </div>
        </div>
      )}

      {/* ─── Main 2-col grid: Tasks+Docs left, Estimates+Activity right ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left Column */}
        <div className="space-y-4">
          {/* Tasks */}
          {linkedTasks.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tasks</h3>
              <div className="space-y-1.5">
                {linkedTasks
                  .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((task: any) => (
                  <div key={task.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    onClick={() => setSelectedTask(task)}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.status === "completed" ? "bg-emerald-500" :
                        task.status === "in_progress" ? "bg-blue-500" : "bg-slate-300"
                      }`} />
                      <div className="min-w-0">
                        <div className={`text-sm font-medium truncate ${task.status === "completed" ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {task.status === "completed" ? "Completed" : task.status === "in_progress" ? "In Progress" : "To Do"}
                          {task.dueDate && ` — Due ${formatDate(task.dueDate)}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {task.status !== "completed" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTaskComplete(task.id); }}
                          disabled={completingTaskId === task.id}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition disabled:opacity-50"
                          title="Mark complete">
                          <CheckCircle size={10} />
                          {completingTaskId === task.id ? "..." : "Done"}
                        </button>
                      )}
                      <ChevronRight size={12} className="text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={12} className="text-indigo-500" /> Documents
              </h3>
              <span className="text-[10px] text-slate-400">{leadDocuments.length} file{leadDocuments.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Upload Tiles */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 mb-3">
              {DOC_TYPES.map((dt) => {
                const existing = leadDocuments.filter((d: any) => d.docType === dt.value);
                const hasDoc = existing.length > 0;
                const IconComp = dt.icon;
                return (
                  <button
                    key={dt.value}
                    onClick={() => setDocUploadModal(dt.value)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 border-dashed transition text-center ${
                      hasDoc
                        ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                        : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                    }`}>
                    <IconComp size={16} className={hasDoc ? "text-emerald-600" : "text-slate-400"} />
                    <span className={`text-[10px] font-medium leading-tight ${hasDoc ? "text-emerald-700" : "text-slate-500"}`}>
                      {dt.label}
                    </span>
                    {hasDoc ? (
                      <span className="text-[9px] text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle size={8} /> {existing.length}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                        <Upload size={8} /> Upload
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Existing Documents List */}
            {leadDocuments.length > 0 && (
              <div className="space-y-1">
                {leadDocuments.map((doc: any) => {
                  const typeInfo = DOC_TYPES.find((d) => d.value === doc.docType);
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded bg-indigo-50">
                          <FileText size={11} className="text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-800 truncate">{doc.title || typeInfo?.label || "Document"}</div>
                          <div className="text-[10px] text-slate-400">
                            {typeInfo?.label || doc.docType}
                            {doc.fileName && ` — ${doc.fileName}`}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDocDelete(doc.id)}
                        className="text-slate-300 hover:text-red-500 transition p-1" title="Remove">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {leadDocuments.length === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-1">Documents transfer to Projects when the lead is won.</p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <NotesTab entityType="lead" entityId={lead.id} />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Estimates */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={12} className="text-indigo-500" /> Estimates
                {(consultationEstimates.length > 0 || lead.estimates?.length > 0) && (
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    {consultationEstimates.length + (lead.estimates?.length || 0)}
                  </span>
                )}
              </h3>
              <Link href={`/estimates/consultation?leadId=${lead.id}`}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                <FileText size={10} /> + Consultation
              </Link>
            </div>

            {/* Consultation Estimates */}
            {consultationEstimates.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {consultationEstimates.map((est: any) => {
                  const isApproved = est.status === "approved" || est.status === "converted" || est.status === "accepted";
                  return (
                    <div key={est.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                      <Link href={`/estimates/consultation/${est.id}`} className="flex-1 hover:opacity-80 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">
                          Consultation{est.customerPrice ? ` — ${formatCurrency(est.customerPrice)}` : est.totalCost ? ` — ${formatCurrency(est.totalCost)}` : ""}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            isApproved ? "bg-emerald-100 text-emerald-700" :
                            est.status === "sent" ? "bg-blue-100 text-blue-600" :
                            "bg-slate-100 text-slate-500"
                          }`}>
                            {est.status || "draft"}
                          </span>
                          {est.createdAt && <span>{formatDate(est.createdAt)}</span>}
                        </div>
                      </Link>
                      {!isApproved && est.status !== "rejected" && (
                        <button onClick={() => handleApproveEstimate(est.id)}
                          disabled={approvingEstimateId === est.id}
                          className="ml-2 flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition disabled:opacity-50">
                          <Check size={10} />
                          {approvingEstimateId === est.id ? "..." : "Approve"}
                        </button>
                      )}
                      {isApproved && (
                        <span className="ml-2 flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                          <Check size={10} /> Approved
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Standard Estimates */}
            {lead.estimates?.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {lead.estimates.map((est: any) => (
                  <div key={est.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                    <Link href={`/estimates/${est.id}`} className="flex-1 hover:opacity-80 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {est.estimateNumber || "Estimate"}{est.data?.totalAmount ? ` — ${formatCurrency(est.data.totalAmount)}` : ""}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          est.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                          est.status === "sent" ? "bg-blue-100 text-blue-600" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {est.status || "draft"}
                        </span>
                        {est.createdAt && <span>{formatDate(est.createdAt)}</span>}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {consultationEstimates.length === 0 && (!lead.estimates || lead.estimates.length === 0) && (
              <p className="text-xs text-slate-400">No estimates yet</p>
            )}
          </div>

          {/* Activity Log */}
          <ActivityFeed
            parentType="lead"
            parentId={lead.id}
            activities={activities}
            linkedActivities={linkedActivities}
          />
        </div>
      </div>

      {/* ─── Modals ─── */}
      <EmailCompose
        isOpen={showEmailCompose}
        onClose={() => setShowEmailCompose(false)}
        defaultTo={lead.email || ""}
        recipientName={leadName}
        parentType="lead"
        parentId={lead.id}
      />

      <SMSCompose
        isOpen={showSMSCompose}
        onClose={() => setShowSMSCompose(false)}
        defaultTo={lead.phone || ""}
        recipientName={leadName}
        parentType="lead"
        parentId={lead.id}
      />

      <PandaDocSend
        isOpen={showPandaDoc}
        onClose={() => setShowPandaDoc(false)}
        contactEmail={lead.email || ""}
        contactName={leadName}
        parentType="lead"
        parentId={lead.id}
        documentName={`Proposal - ${lead.projectType || "Project"} - ${leadName}`}
      />

      {/* Site Visit Date/Time Modal */}
      {showSiteVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Schedule Site Visit</h3>
            <p className="text-sm text-slate-500 mb-4">Enter the date and time for the site visit.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Visit Date *</label>
                <input type="date" value={siteVisitDate} onChange={(e) => setSiteVisitDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Visit Time</label>
                <input type="time" value={siteVisitTime} onChange={(e) => setSiteVisitTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                <select value={siteVisitAssignee} onChange={(e) => setSiteVisitAssignee(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="">Auto-assign</option>
                  {fieldEstimators.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name}{w.position ? ` (${w.position})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setShowSiteVisitModal(false); setSiteVisitDate(""); setSiteVisitTime(""); setSiteVisitAssignee(""); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
                Cancel
              </button>
              <button onClick={handleSiteVisitSubmit} disabled={!siteVisitDate || siteVisitSaving}
                className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:opacity-50">
                {siteVisitSaving ? "Saving..." : "Schedule & Move to Site Visit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {docUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDocUploadModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Upload {DOC_TYPES.find((d) => d.value === docUploadModal)?.label || "Document"}
              </h3>
              <button onClick={() => setDocUploadModal(null)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* File picker */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">File</label>
                <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition py-4 ${
                  docFile ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                }`}>
                  <input type="file" className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff,.xlsx,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setDocFile(file);
                      if (file && !docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
                    }} />
                  {docFile ? (
                    <div className="text-center">
                      <FileText size={20} className="mx-auto text-emerald-600 mb-1" />
                      <p className="text-xs font-medium text-emerald-700">{docFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(docFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={20} className="mx-auto text-slate-400 mb-1" />
                      <p className="text-xs text-slate-500">Click to select a file</p>
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input type="text" value={docTitle} onChange={(e) => setDocTitle(e.target.value)}
                  placeholder={DOC_TYPES.find((d) => d.value === docUploadModal)?.label || "Document title"}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reference # (optional)</label>
                <input type="text" value={docRef} onChange={(e) => setDocRef(e.target.value)}
                  placeholder="Reference or permit number"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
                <textarea value={docNotes} onChange={(e) => setDocNotes(e.target.value)} rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>

              {docUploadModal === "initial_sampling" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-[11px] text-blue-700">
                    <strong>Note:</strong> This Sampling Report will transfer to the Project when the lead is won and will fulfill the sampling requirement to start the project.
                  </p>
                </div>
              )}

              {docUploadModal === "state_permit" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-[11px] text-blue-700">
                    <strong>Note:</strong> This Permit will transfer to the Project when the lead is won and will fulfill the permit requirement to start the project.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button onClick={() => setDocUploadModal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition">
                Cancel
              </button>
              <button onClick={handleDocUpload} disabled={docSaving}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5">
                {docSaving ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Upload
              </button>
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
            await handleTaskComplete(taskId);
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

      {/* Edit Lead Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-200 z-10">
              <h3 className="text-lg font-bold text-slate-900">Edit Lead</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">First Name</label>
                    <input type="text" value={editForm.firstName} onChange={(e) => updateEdit("firstName", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
                    <input type="text" value={editForm.lastName} onChange={(e) => updateEdit("lastName", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                    <input type="tel" value={editForm.phone} onChange={(e) => updateEdit("phone", e.target.value)}
                      placeholder="(970) 555-1234"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input type="email" value={editForm.email} onChange={(e) => updateEdit("email", e.target.value)}
                      placeholder="email@example.com"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
              </div>

              {/* Property / Location */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Property / Location</h4>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                  <AddressAutocomplete
                    value={editForm.address}
                    onChange={(val) => updateEdit("address", val)}
                    onSelect={(result) => {
                      updateEdit("address", result.address);
                      if (result.city) updateEdit("city", result.city);
                      if (result.state) updateEdit("state", result.state);
                      if (result.zip) updateEdit("zip", result.zip);
                    }}
                    placeholder="Start typing an address..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                    <input type="text" value={editForm.city} onChange={(e) => updateEdit("city", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                    <input type="text" value={editForm.state} onChange={(e) => updateEdit("state", e.target.value)}
                      maxLength={2}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Zip Code</label>
                    <input type="text" value={editForm.zip} onChange={(e) => updateEdit("zip", e.target.value)}
                      maxLength={10}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Project Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Project Type</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {["ASBESTOS", "LEAD", "METH", "MOLD", "SELECT_DEMO", "REBUILD"].map((t) => {
                        const selected = (editForm.projectType || "").split(",").filter(Boolean).includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              const current = (editForm.projectType || "").split(",").filter(Boolean);
                              const next = selected ? current.filter((x: string) => x !== t) : [...current, t];
                              updateEdit("projectType", next.join(","));
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                              selected
                                ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {t === "SELECT_DEMO" ? "Select Demo" : t === "METH" ? "Meth Lab" : t.charAt(0) + t.slice(1).toLowerCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Office</label>
                    <select value={editForm.office} onChange={(e) => updateEdit("office", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="greeley">Greeley (Front Range)</option>
                      <option value="grand_junction">Grand Junction (Western Slope)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Value ($)</label>
                    <input type="number" value={editForm.estimatedValue} onChange={(e) => updateEdit("estimatedValue", e.target.value)}
                      placeholder="0"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Lead Source</label>
                    <select value={editForm.source} onChange={(e) => updateEdit("source", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                      {[
                        { value: "referral", label: "Referral" },
                        { value: "website", label: "Website" },
                        { value: "cold_call", label: "Cold Call" },
                        { value: "repeat_client", label: "Repeat Client" },
                        { value: "insurance", label: "Insurance" },
                        { value: "property_manager", label: "Property Manager" },
                        { value: "realtor", label: "Realtor" },
                        { value: "other", label: "Other" },
                      ].map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Referral Source</label>
                    <ReferralSourcePicker
                      value={editForm.referralSource}
                      onChange={(val) => updateEdit("referralSource", val)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                  <textarea value={editForm.notes} onChange={(e) => updateEdit("notes", e.target.value)}
                    rows={3} placeholder="Scope details, special conditions..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>

              {/* Site Visit */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Site Visit</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Visit Date</label>
                    <input type="date" value={editForm.siteVisitDate} onChange={(e) => updateEdit("siteVisitDate", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Visit Notes</label>
                    <input type="text" value={editForm.siteVisitNotes} onChange={(e) => updateEdit("siteVisitNotes", e.target.value)}
                      placeholder="Access instructions, etc."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
              </div>

              {/* Insurance */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Insurance</h4>
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input type="checkbox" checked={editForm.isInsuranceJob}
                    onChange={(e) => updateEdit("isInsuranceJob", e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                  <span className="text-sm font-medium text-slate-700">This is an insurance job</span>
                </label>
                {editForm.isInsuranceJob && (
                  <div className="space-y-3 pl-7 border-l-2 border-indigo-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Insurance Carrier</label>
                        <input type="text" value={editForm.insuranceCarrier} onChange={(e) => updateEdit("insuranceCarrier", e.target.value)}
                          placeholder="State Farm, USAA, etc."
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Claim Number</label>
                        <input type="text" value={editForm.claimNumber} onChange={(e) => updateEdit("claimNumber", e.target.value)}
                          placeholder="Claim #"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Adjuster Name</label>
                        <input type="text" value={editForm.adjusterName} onChange={(e) => updateEdit("adjusterName", e.target.value)}
                          placeholder="Adjuster name"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Adjuster Phone</label>
                        <input type="text" value={editForm.adjusterPhone} onChange={(e) => updateEdit("adjusterPhone", e.target.value)}
                          placeholder="Phone or email"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                    </div>
                    <div className="max-w-xs">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Date of Loss</label>
                      <input type="date" value={editForm.dateOfLoss} onChange={(e) => updateEdit("dateOfLoss", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white px-6 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowEditModal(false)} disabled={editSaving}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5">
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Delete Lead</h3>
            </div>
            <p className="text-sm text-slate-600 mb-1">
              Are you sure you want to delete <span className="font-semibold">{leadName}</span>?
            </p>
            <p className="text-xs text-slate-400 mb-5">
              This will permanently remove the lead and all associated activity logs. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
                Cancel
              </button>
              <button onClick={handleDeleteLead} disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-1.5">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "Deleting..." : "Delete Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
