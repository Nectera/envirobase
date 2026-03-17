"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Copy, Trash2 } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

export default function ConsultationActions({
  id,
  customerName,
}: {
  id: string;
  customerName: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const handleDelete = async () => {
    const msg = t("estimates.deleteConsultationConfirm").replace("{customerName}", customerName);
    if (!confirm(msg)) return;
    setDeleting(true);
    try {
      await fetch(`/api/consultation-estimates/${id}`, { method: "DELETE" });
      router.refresh();
    } catch {
      alert(t("estimates.failedDeleteConsultation"));
    }
    setDeleting(false);
    setOpen(false);
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/consultation-estimates/${id}`);
      const data = await res.json();
      // Strip id, timestamps, status, estimateId for new copy
      const { id: _id, createdAt, updatedAt, status, estimateId, ...rest } = data;
      const dupRes = await fetch("/api/consultation-estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rest, status: "draft", customerName: `${rest.customerName} (Copy)` }),
      });
      if (dupRes.ok) {
        const newItem = await dupRes.json();
        router.push(`/estimates/consultation/${newItem.id}`);
      }
    } catch {
      alert(t("estimates.failedDuplicate"));
    }
    setDuplicating(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded hover:bg-slate-100 transition text-slate-400 hover:text-slate-600"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-40">
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/estimates/consultation/${id}/edit`);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("estimates.edit")}
            </button>
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              {duplicating ? t("estimates.duplicating") : t("estimates.duplicate")}
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? t("estimates.deleting") : t("estimates.delete")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
