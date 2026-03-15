"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, MessageSquare, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "./LanguageProvider";

interface SMSComposeProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTo?: string;
  parentType?: string;
  parentId?: string;
  recipientName?: string;
}

export default function SMSCompose({
  isOpen,
  onClose,
  defaultTo = "",
  parentType,
  parentId,
  recipientName,
}: SMSComposeProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [to, setTo] = useState(defaultTo);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!to.trim() || !text.trim()) {
      setErrorMsg(t("sms.fillRequired"));
      setStatus("error");
      return;
    }

    setSending(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const res = await fetch("/api/ringcentral/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          text: text.trim(),
          parentType,
          parentId,
          contactName: recipientName,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setTimeout(() => {
          onClose();
          setTo(defaultTo);
          setText("");
          setStatus("idle");
          router.refresh();
        }, 1500);
      } else {
        setErrorMsg(data.error || t("sms.sendFailed"));
        setStatus("error");
      }
    } catch {
      setErrorMsg(t("sms.sendFailed"));
      setStatus("error");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
    onClose();
    setTo(defaultTo);
    setText("");
    setStatus("idle");
    setErrorMsg("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("sms.compose")}
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
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t("sms.to")} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t("sms.message")} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("sms.messagePlaceholder")}
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
            <div className="text-right text-[10px] text-slate-400 mt-1">
              {text.length}/1000
            </div>
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle size={16} className="text-emerald-600" />
              <span className="text-sm text-emerald-700">{t("sms.sent")}</span>
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
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={handleClose}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
          >
            {t("sms.cancel")}
          </button>
          <button
            onClick={handleSend}
            disabled={sending || status === "success"}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {sending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <MessageSquare size={14} />
            )}
            {sending ? t("sms.sending") : t("sms.send")}
          </button>
        </div>
      </div>
    </div>
  );
}
