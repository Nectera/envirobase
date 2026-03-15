"use client";

import { useState, useEffect } from "react";
import { FileText, Eye, CheckCircle, XCircle, Send, Loader2 } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  "document.uploaded": { label: "Processing", color: "bg-slate-100 text-slate-700", icon: Loader2 },
  "document.draft": { label: "Draft", color: "bg-slate-100 text-slate-700", icon: FileText },
  "document.sent": { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Send },
  "document.viewed": { label: "Viewed", color: "bg-amber-100 text-amber-700", icon: Eye },
  "document.waiting_approval": { label: "Awaiting Approval", color: "bg-purple-100 text-purple-700", icon: FileText },
  "document.completed": { label: "Signed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  "document.rejected": { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  "document.declined": { label: "Declined", color: "bg-red-100 text-red-700", icon: XCircle },
  "document.expired": { label: "Expired", color: "bg-amber-100 text-amber-700", icon: FileText },
};

interface Props {
  documentId: string;
  compact?: boolean;
}

export default function PandaDocStatus({ documentId, compact = false }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    fetch(`/api/pandadoc/documents/${documentId}`)
      .then((r) => r.json())
      .then((doc) => {
        setStatus(doc.status || null);
        setDocName(doc.name || "");
      })
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Loader2 size={12} className="animate-spin" />
        {!compact && "Loading..."}
      </span>
    );
  }

  if (!status) return null;

  const config = STATUS_CONFIG[status] || {
    label: status.replace("document.", ""),
    color: "bg-slate-100 text-slate-700",
    icon: FileText,
  };
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded ${config.color}`}
        title={`PandaDoc: ${config.label}${docName ? ` — ${docName}` : ""}`}
      >
        <Icon size={10} className={status === "document.uploaded" ? "animate-spin" : ""} />
        {config.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded ${config.color}`}>
        <Icon size={12} className={status === "document.uploaded" ? "animate-spin" : ""} />
        PandaDoc: {config.label}
      </span>
      {docName && (
        <span className="text-xs text-slate-400 truncate max-w-[200px]">{docName}</span>
      )}
    </div>
  );
}
