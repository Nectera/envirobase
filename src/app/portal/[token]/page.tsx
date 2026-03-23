"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2, CheckCircle2, Clock, FileText, MessageSquare, Send,
  MapPin, AlertTriangle, ChevronDown, ChevronUp, Mail, ChevronRight,
  Download, ExternalLink,
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
  const [tab, setTab] = useState<"timeline" | "documents" | "reports" | "messages">("timeline");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
