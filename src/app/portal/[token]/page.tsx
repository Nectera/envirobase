"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2, CheckCircle2, Clock, FileText, MessageSquare, Send,
  MapPin, AlertTriangle, ChevronDown, ChevronUp, Mail, ChevronRight,
  Download, ExternalLink, Package, Archive, Trash2, StickyNote,
  Image as ImageIcon,
} from "lucide-react";

interface PortalDocument {
  id: string;
  name: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  docType: string | null;
  displayType: string;
  date: string | null;
  createdAt: string;
}

interface PortalData {
  portal: { id: string; clientName: string | null; clientEmail: string | null };
  project: {
    id: string;
    projectNumber: string | null;
    name: string;
    type: string;
    subtype: string | null;
    status: string;
    address: string | null;
    client: string | null;
    startDate: string | null;
    estEndDate: string | null;
    estimatedDays: number | null;
    office: string | null;
    clearanceResult: string | null;
    clearanceDate: string | null;
    progressPercent: number | null;
  };
  documents: PortalDocument[];
  fieldReports: FieldReport[];
  activities: ActivityItem[];
  messages: Message[];
  inventory: InventoryData | null;
}

interface InventoryData {
  reviewToken: string;
  reviewStatus: string;
  completedAt: string | null;
  items: InventoryItem[];
  stats: { total: number; pending: number; keep: number; dispose: number };
}

interface InventoryItem {
  id: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  location: string | null;
  status: string;
  customerNote: string | null;
  photos: { id: string; url: string; caption: string | null }[];
}

interface FieldReport {
  id: string;
  date: string;
  supervisorName: string;
  workCompletedToday: string;
  plannedForTomorrow: string;
  incident: boolean;
  nearMiss: boolean;
  stopWork: boolean;
  photos: string[];
}

interface ActivityItem {
  id: string;
  type: string;
  content: string;
  user: string;
  createdAt: string;
}

interface Message {
  id: string;
  sender: string;
  isClient: boolean;
  content: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planning: { label: "Planning", color: "text-slate-600", bg: "bg-slate-100" },
  assessment: { label: "Assessment", color: "text-blue-600", bg: "bg-blue-100" },
  in_progress: { label: "In Progress", color: "text-emerald-600", bg: "bg-emerald-100" },
  completed: { label: "Completed", color: "text-purple-600", bg: "bg-purple-100" },
};

const ACTIVITY_ICONS: Record<string, any> = {
  note: MessageSquare,
  email: Mail,
  status_change: ChevronRight,
  site_visit: MapPin,
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const BRAND_COLOR = process.env.NEXT_PUBLIC_BRAND_COLOR || "#7BC143";
const APP_LABEL = process.env.NEXT_PUBLIC_COMPANY_SHORT || "EnviroBase";

export default function PortalPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"timeline" | "documents" | "reports" | "messages" | "inventory">("timeline");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Inventory tab state
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [decidingItem, setDecidingItem] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState<Record<string, string>>({});
  const [completingReview, setCompletingReview] = useState(false);
  const [inventoryMessage, setInventoryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [photoModal, setPhotoModal] = useState<{ url: string; caption: string | null } | null>(null);

  useEffect(() => {
    fetchData();
  }, [params.token]);

  useEffect(() => {
    if (tab === "messages") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data?.messages, tab]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/public/portal/${params.token}`);
      if (!res.ok) {
        setError(res.status === 404 ? "This portal link is no longer active." : "Failed to load portal");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Failed to load portal");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/public/portal/${params.token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });
      if (res.ok) {
        const msg = await res.json();
        setData((prev) =>
          prev ? { ...prev, messages: [...prev.messages, msg] } : prev
        );
        setNewMessage("");
      }
    } catch {
      // silent fail
    } finally {
      setSending(false);
    }
  };

  const handleDecide = async (itemId: string, status: "keep" | "dispose") => {
    if (!data?.inventory) return;
    setDecidingItem(itemId);
    setInventoryMessage(null);
    try {
      const note = customerNotes[itemId]?.trim() || undefined;
      const res = await fetch(`/api/public/inventory/${data.inventory.reviewToken}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status, customerNote: note }),
      });
      if (res.ok) {
        setData((prev) => {
          if (!prev?.inventory) return prev;
          const updatedItems = prev.inventory.items.map((item) =>
            item.id === itemId ? { ...item, status, customerNote: note || item.customerNote } : item
          );
          const stats = {
            total: updatedItems.length,
            pending: updatedItems.filter((i) => i.status === "pending").length,
            keep: updatedItems.filter((i) => i.status === "keep").length,
            dispose: updatedItems.filter((i) => i.status === "dispose").length,
          };
          return {
            ...prev,
            inventory: { ...prev.inventory, items: updatedItems, stats, reviewStatus: prev.inventory.reviewStatus === "pending" ? "in_progress" : prev.inventory.reviewStatus },
          };
        });
      } else {
        const err = await res.json();
        setInventoryMessage({ type: "error", text: err.error || "Failed to save decision" });
      }
    } catch {
      setInventoryMessage({ type: "error", text: "Failed to save decision" });
    } finally {
      setDecidingItem(null);
    }
  };

  const handleCompleteReview = async () => {
    if (!data?.inventory) return;
    setCompletingReview(true);
    setInventoryMessage(null);
    try {
      const res = await fetch(`/api/public/inventory/${data.inventory.reviewToken}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setData((prev) => {
          if (!prev?.inventory) return prev;
          return {
            ...prev,
            inventory: { ...prev.inventory, reviewStatus: "completed", completedAt: new Date().toISOString() },
          };
        });
        setInventoryMessage({ type: "success", text: "Review submitted successfully! Thank you." });
      } else {
        const err = await res.json();
        setInventoryMessage({ type: "error", text: err.error || "Failed to complete review" });
      }
    } catch {
      setInventoryMessage({ type: "error", text: "Failed to complete review" });
    } finally {
      setCompletingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-slate-400" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800 mb-2">{error || "Portal not found"}</h1>
          <p className="text-sm text-slate-500">Please contact your project team for an updated link.</p>
        </div>
      </div>
    );
  }

  const { project, documents, fieldReports, activities, messages } = data;
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
  const unreadMessages = messages.filter((m) => !m.isClient).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND_COLOR }}>
              <span className="text-white text-xs font-bold">{APP_LABEL.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">{project.name}</h1>
              {project.projectNumber && (
                <span className="text-xs text-slate-400">#{project.projectNumber}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Project Status Card */}
      <div className="max-w-3xl mx-auto px-4 py-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              <span className="text-xs text-slate-400 uppercase">{project.type?.replace(",", " / ")}</span>
            </div>
            {project.clearanceResult === "pass" && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> Clearance Passed
              </span>
            )}
          </div>

          {project.address && (
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
              <MapPin size={14} className="text-slate-400 flex-shrink-0" />
              {project.address}
            </div>
          )}

          <div className="flex gap-6 text-xs text-slate-500 mb-4">
            {project.startDate && <span>Start: <strong className="text-slate-700">{formatDate(project.startDate)}</strong></span>}
            {project.estEndDate && <span>Est. End: <strong className="text-slate-700">{formatDate(project.estEndDate)}</strong></span>}
            {project.estimatedDays && <span>Duration: <strong className="text-slate-700">{project.estimatedDays} days</strong></span>}
          </div>

          {/* Progress bar */}
          {project.progressPercent != null && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500">Project Progress</span>
                <span className="font-semibold text-slate-700">{project.progressPercent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    project.progressPercent >= 100 ? "bg-emerald-500" : ""
                  }`}
                  style={{ width: `${project.progressPercent}%`, backgroundColor: project.progressPercent >= 100 ? undefined : BRAND_COLOR }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 mb-5 shadow-sm">
          {([
            { key: "timeline" as const, label: "Timeline", icon: Clock, count: 0 },
            ...(documents.length > 0 ? [{ key: "documents" as const, label: "Documents", icon: Download, count: documents.length }] : []),
            { key: "reports" as const, label: "Field Reports", icon: FileText, count: fieldReports.length },
            { key: "messages" as const, label: "Messages", icon: MessageSquare, count: messages.length },
            ...(data.inventory && data.inventory.items.length > 0 ? [{ key: "inventory" as const, label: "Inventory", icon: Package, count: data.inventory.items.length }] : []),
          ]).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg transition ${
                tab === key
                  ? "text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
              style={tab === key ? { backgroundColor: BRAND_COLOR } : undefined}
            >
              <Icon size={14} />
              {label}
              {count !== undefined && count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Timeline Tab */}
        {tab === "timeline" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Project Timeline</h2>
            </div>
            {activities.length === 0 ? (
              <div className="p-8 text-center">
                <Clock size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No timeline updates yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {activities.map((a) => {
                  const Icon = ACTIVITY_ICONS[a.type] || MessageSquare;
                  return (
                    <div key={a.id} className="px-5 py-3 flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon size={13} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{a.content}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span>{formatDateTime(a.createdAt)}</span>
                          {a.user && <span>· {a.user}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {tab === "documents" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Documents</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.fileUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        doc.displayType === "Contract"
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-emerald-100 text-emerald-600"
                      }`}>
                        {doc.displayType}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 truncate">{doc.fileName || doc.name || "Document"}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      {doc.date && <span>{formatDate(doc.date)}</span>}
                      {doc.fileSize && <span>· {formatFileSize(doc.fileSize)}</span>}
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Field Reports Tab */}
        {tab === "reports" && (
          <div className="space-y-3">
            {fieldReports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                <FileText size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No field reports submitted yet</p>
              </div>
            ) : (
              fieldReports.map((r) => {
                const isExpanded = expandedReport === r.id;
                return (
                  <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpandedReport(isExpanded ? null : r.id)}
                      className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <FileText size={14} className="text-slate-500" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-slate-800">{formatDate(r.date)}</p>
                          <p className="text-xs text-slate-400">Supervisor: {r.supervisorName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.incident && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600">INCIDENT</span>
                        )}
                        {r.stopWork && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600">STOP WORK</span>
                        )}
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 border-t border-slate-50">
                        {r.workCompletedToday && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-slate-500 mb-1">Work Completed</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.workCompletedToday}</p>
                          </div>
                        )}
                        {r.plannedForTomorrow && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-slate-500 mb-1">Planned for Tomorrow</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.plannedForTomorrow}</p>
                          </div>
                        )}
                        {r.photos && r.photos.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-slate-500 mb-1">Photos ({r.photos.length})</p>
                            <div className="flex gap-2 flex-wrap">
                              {r.photos.map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={url}
                                    alt={`Report photo ${i + 1}`}
                                    className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Messages Tab */}
        {tab === "messages" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col" style={{ minHeight: "400px" }}>
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Messages</h2>
              <p className="text-xs text-slate-400 mt-0.5">Send a message to your project team</p>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No messages yet. Send one to get started.</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.isClient ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                        m.isClient
                          ? "text-white rounded-br-md"
                          : "bg-slate-100 text-slate-800 rounded-bl-md"
                      }`}
                      style={m.isClient ? { backgroundColor: BRAND_COLOR } : undefined}
                    >
                      {!m.isClient && (
                        <p className={`text-[10px] font-semibold mb-0.5 ${m.isClient ? "text-white/70" : "text-slate-500"}`}>
                          {m.sender}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${m.isClient ? "text-white/60" : "text-slate-400"}`}>
                        {formatDateTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="border-t border-slate-100 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{ ["--tw-ring-color" as any]: BRAND_COLOR }}
                  maxLength={2000}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2.5 hover:opacity-90 disabled:bg-slate-200 text-white rounded-xl transition flex items-center gap-1.5"
                  style={{ backgroundColor: !newMessage.trim() || sending ? undefined : BRAND_COLOR }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Inventory Tab ── */}
        {tab === "inventory" && data.inventory && (
          <div className="space-y-4">
            {/* Photo lightbox modal */}
            {photoModal && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
                <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                  <img src={photoModal.url} alt={photoModal.caption || "Inventory photo"} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
                  {photoModal.caption && (
                    <p className="text-white text-sm text-center mt-2">{photoModal.caption}</p>
                  )}
                  <button onClick={() => setPhotoModal(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-lg">✕</button>
                </div>
              </div>
            )}

            {/* Stats banner */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800">Content Inventory</h2>
                {data.inventory.reviewStatus === "completed" && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Review Complete
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-4">
                {data.inventory.reviewStatus === "completed"
                  ? "Your inventory review has been submitted. Thank you!"
                  : "Review each item below and mark whether you'd like to keep or dispose of it."}
              </p>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-slate-800">{data.inventory.stats.total}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Total</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-amber-600">{data.inventory.stats.pending}</p>
                  <p className="text-[10px] text-amber-600 font-medium">Pending</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600">{data.inventory.stats.keep}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Keep</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-red-500">{data.inventory.stats.dispose}</p>
                  <p className="text-[10px] text-red-500 font-medium">Dispose</p>
                </div>
              </div>
            </div>

            {/* Feedback messages */}
            {inventoryMessage && (
              <div className={`rounded-xl px-4 py-3 text-sm ${
                inventoryMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}>
                {inventoryMessage.text}
              </div>
            )}

            {/* Item cards */}
            {data.inventory.items.map((item) => {
              const isExpanded = expandedItem === item.id;
              const isDeciding = decidingItem === item.id;
              const isCompleted = data.inventory!.reviewStatus === "completed";
              const statusBadge = item.status === "keep"
                ? { bg: "bg-emerald-100", text: "text-emerald-700", label: "Keep", icon: Archive }
                : item.status === "dispose"
                ? { bg: "bg-red-100", text: "text-red-600", label: "Dispose", icon: Trash2 }
                : { bg: "bg-amber-100", text: "text-amber-700", label: "Pending", icon: Clock };
              const StatusIcon = statusBadge.icon;

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition text-left"
                  >
                    {item.photos.length > 0 ? (
                      <img src={item.photos[0].url} alt="" className="w-14 h-14 object-cover rounded-xl border border-slate-200 flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Package size={20} className="text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {[item.brand, item.model].filter(Boolean).join(" ") || "Untitled Item"}
                      </p>
                      {item.location && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          <MapPin size={10} className="inline mr-1" />{item.location}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${statusBadge.bg} ${statusBadge.text}`}>
                      <StatusIcon size={10} />{statusBadge.label}
                    </span>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-slate-50">
                      {item.description && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
                          <p className="text-sm text-slate-700">{item.description}</p>
                        </div>
                      )}

                      {item.photos.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-slate-500 mb-2">
                            <ImageIcon size={10} className="inline mr-1" />Photos ({item.photos.length})
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {item.photos.map((photo) => (
                              <button
                                key={photo.id}
                                onClick={() => setPhotoModal({ url: photo.url, caption: photo.caption })}
                                className="relative group"
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.caption || "Item photo"}
                                  className="w-20 h-20 object-cover rounded-lg border border-slate-200 group-hover:opacity-80 transition"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.customerNote && (
                        <div className="mt-3 bg-amber-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-amber-700 flex items-center gap-1 mb-1">
                            <StickyNote size={10} />Your Note
                          </p>
                          <p className="text-sm text-amber-800">{item.customerNote}</p>
                        </div>
                      )}

                      {!isCompleted && (
                        <div className="mt-4 space-y-3">
                          <div>
                            <input
                              type="text"
                              placeholder="Add a note (optional)..."
                              value={customerNotes[item.id] || ""}
                              onChange={(e) => setCustomerNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                              maxLength={500}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDecide(item.id, "keep")}
                              disabled={isDeciding}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                                item.status === "keep"
                                  ? "bg-emerald-500 text-white"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              } disabled:opacity-50`}
                            >
                              {isDeciding ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                              Keep
                            </button>
                            <button
                              onClick={() => handleDecide(item.id, "dispose")}
                              disabled={isDeciding}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                                item.status === "dispose"
                                  ? "bg-red-500 text-white"
                                  : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                              } disabled:opacity-50`}
                            >
                              {isDeciding ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              Dispose
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Complete review button */}
            {data.inventory.reviewStatus !== "completed" && data.inventory.stats.pending === 0 && data.inventory.stats.total > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-sm text-slate-600 mb-3">
                  All items have been reviewed. Ready to submit?
                </p>
                <button
                  onClick={handleCompleteReview}
                  disabled={completingReview}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 hover:opacity-90 disabled:bg-slate-200 text-white rounded-xl text-sm font-semibold transition"
                  style={{ backgroundColor: completingReview ? undefined : BRAND_COLOR }}
                >
                  {completingReview ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Submit Inventory Review
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-xs text-slate-400">
            Powered by <span className="font-semibold text-slate-500">{APP_LABEL}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
