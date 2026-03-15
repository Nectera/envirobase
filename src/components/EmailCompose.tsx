"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "./LanguageProvider";

interface EmailComposeProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  parentType?: string;
  parentId?: string;
  recipientName?: string;
}

export default function EmailCompose({
  isOpen,
  onClose,
  defaultTo = "",
  defaultSubject = "",
  parentType,
  parentId,
  recipientName,
}: EmailComposeProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setErrorMsg(t("email.fillRequired"));
      setStatus("error");
      return;
    }

    setSending(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim() || undefined,
          subject: subject.trim(),
          body: body.trim(),
          parentType,
          parentId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setTimeout(() => {
          onClose();
          setTo(defaultTo);
          setCc("");
          setSubject("");
          setBody("");
          setStatus("idle");
          router.refresh();
        }, 1500);
      } else {
        setErrorMsg(data.error || t("email.sendFailed"));
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg(t("email.sendFailed"));
      setStatus("error");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
    onClose();
    setTo(defaultTo);
    setCc("");
    setSubject("");
    setBody("");
    setStatus("idle");
    setErrorMsg("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("email.compose")}
            {recipientName && (
              <span className="text-sm font-normal text-slate-500 ml-2">
                — {recipientName}
              </span>
            )}
          </h2>
          <button
            onClick={handleClose}
            disabled={sending}
            className="p-1 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* To */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t("email.to")} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* CC */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t("email.cc")}
            </label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t("email.subject")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("email.subjectPlaceholder")}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t("email.message")} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("email.messagePlaceholder")}
              rows={8}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </div>

          {/* Status messages */}
          {status === "success" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle size={16} className="text-emerald-600" />
              <span className="text-sm text-emerald-700">{t("email.sent")}</span>
            </div>
          )}
          {status === "error" && errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-600" />
              <span className="text-sm text-red-700">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <p className="text-[11px] text-slate-400">
            {t("email.sentFrom")} {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@company.com"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
            >
              {t("email.cancel")}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || status === "success"}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {sending ? t("email.sending") : t("email.send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
