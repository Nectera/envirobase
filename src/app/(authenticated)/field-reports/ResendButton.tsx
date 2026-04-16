"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle } from "lucide-react";

type Props = {
  reportId: string;
  status: string;
  /** Compact mode for table rows — icon only */
  compact?: boolean;
};

export default function ResendButton({ reportId, status, compact }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (status === "draft") return null;

  async function handleResend() {
    if (sending || sent) return;
    if (!confirm("Resend this field report to the customer and internal team?")) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/field-reports/${reportId}/resend`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resend");
      }

      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 4000);
    } finally {
      setSending(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResend(); }}
        disabled={sending}
        className={`transition ${
          sent ? "text-emerald-500" : error ? "text-red-500" : "text-slate-400 hover:text-indigo-600"
        }`}
        title={sent ? "Sent!" : error || "Resend to customer"}
      >
        {sending ? <Loader2 size={15} className="animate-spin" /> :
         sent ? <CheckCircle size={15} /> :
         <Send size={15} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleResend}
      disabled={sending}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition ${
        sent
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : error
          ? "bg-red-50 text-red-700 border border-red-200"
          : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
      } disabled:opacity-50`}
    >
      {sending ? <Loader2 size={14} className="animate-spin" /> :
       sent ? <CheckCircle size={14} /> :
       <Send size={14} />}
      {sending ? "Sending..." : sent ? "Sent!" : error ? "Failed" : "Resend"}
    </button>
  );
}
