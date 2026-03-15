"use client";

import { useState, useEffect } from "react";
import { X, FileText, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

interface Template {
  id: string;
  name: string;
  date_created: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  estimateId?: string;
  contactEmail?: string;
  contactName?: string;
  parentType?: string;
  parentId?: string;
  documentName?: string;
}

export default function PandaDocSend({
  isOpen,
  onClose,
  estimateId,
  contactEmail = "",
  contactName = "",
  parentType,
  parentId,
  documentName = "",
}: Props) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [name, setName] = useState(documentName);
  const [email, setEmail] = useState(contactEmail);
  const [recipientName, setRecipientName] = useState(contactName);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"form" | "creating" | "sending" | "done" | "error">("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [createdDocId, setCreatedDocId] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(documentName);
      setEmail(contactEmail);
      setRecipientName(contactName);
      setMessage("");
      setStep("form");
      setErrorMsg("");
      setCreatedDocId("");
      setSelectedTemplate("");
      // Load templates
      setLoadingTemplates(true);
      fetch("/api/pandadoc/templates")
        .then((r) => r.json())
        .then((data) => {
          setTemplates(Array.isArray(data) ? data : []);
        })
        .catch(() => setTemplates([]))
        .finally(() => setLoadingTemplates(false));
    }
  }, [isOpen, contactEmail, contactName, documentName]);

  const handleSend = async () => {
    if (!email.trim() || !name.trim()) {
      setErrorMsg(t("pandadoc.fillRequired"));
      return;
    }

    try {
      // Step 1: Create document
      setStep("creating");
      const createRes = await fetch("/api/pandadoc/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate || undefined,
          estimateId: estimateId || undefined,
          recipientEmail: email,
          recipientName: recipientName,
          name,
          parentType,
          parentId,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to create document");
      }

      const doc = await createRes.json();
      setCreatedDocId(doc.id);

      // Step 2: Wait for document to be ready (3-5 seconds)
      setStep("sending");
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Step 3: Send for signature
      const sendRes = await fetch(`/api/pandadoc/documents/${doc.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `${name} - Please Review & Sign`,
          message: message || `Hi ${recipientName?.split(" ")[0] || ""},\n\nPlease review and sign the attached document.\n\nThank you,\nXtract Environmental Services`,
          parentType,
          parentId,
          estimateId,
        }),
      });

      if (!sendRes.ok) {
        const err = await sendRes.json();
        throw new Error(err.error || "Failed to send document");
      }

      setStep("done");
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message || "Something went wrong");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-violet-600" />
            <h2 className="font-semibold text-slate-900">{t("pandadoc.sendVia")}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        {step === "form" && (
          <div className="p-4 space-y-4">
            {/* Template Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t("pandadoc.selectTemplate")}
              </label>
              {loadingTemplates ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                  <Loader2 size={14} className="animate-spin" /> Loading templates...
                </div>
              ) : (
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">— No template (blank document) —</option>
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Document Name */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t("pandadoc.documentName")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Proposal - Asbestos Abatement"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Recipient */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t("pandadoc.recipientEmail")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t("pandadoc.customMessage")}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Optional message to include in the email..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                <AlertCircle size={14} />
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSend}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition"
              >
                <Send size={14} />
                {t("pandadoc.sendDocument")}
              </button>
            </div>
          </div>
        )}

        {/* Creating state */}
        {step === "creating" && (
          <div className="p-8 text-center">
            <Loader2 size={32} className="animate-spin text-violet-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">{t("pandadoc.creating")}</p>
            <p className="text-xs text-slate-400 mt-1">Building document from template...</p>
          </div>
        )}

        {/* Sending state */}
        {step === "sending" && (
          <div className="p-8 text-center">
            <Loader2 size={32} className="animate-spin text-violet-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">{t("pandadoc.sending")}</p>
            <p className="text-xs text-slate-400 mt-1">Sending for e-signature...</p>
          </div>
        )}

        {/* Done state */}
        {step === "done" && (
          <div className="p-8 text-center">
            <CheckCircle size={32} className="text-green-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-green-700">{t("pandadoc.sent")}</p>
            <p className="text-xs text-slate-400 mt-1">Document sent to {email}</p>
          </div>
        )}

        {/* Error state */}
        {step === "error" && (
          <div className="p-6">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">Failed to send document</p>
            </div>
            <p className="text-sm text-slate-600 mb-4">{errorMsg}</p>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">
                Close
              </button>
              <button
                onClick={() => { setStep("form"); setErrorMsg(""); }}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
