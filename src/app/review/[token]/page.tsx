"use client";

import { useState, useEffect } from "react";
import {
  Check,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Package,
  CheckCircle2,
} from "lucide-react";

interface Photo {
  id: string;
  url: string;
  fileName?: string;
}

interface InventoryItem {
  id: string;
  brand: string | null;
  model: string | null;
  description: string;
  location: string | null;
  status: string;
  customerNote: string | null;
  photos: Photo[];
}

interface ReviewData {
  review: {
    id: string;
    status: string;
    customerName: string | null;
    completedAt: string | null;
  };
  project: {
    id: string;
    name: string;
    client: string | null;
    address: string | null;
  };
  items: InventoryItem[];
  stats: {
    total: number;
    pending: number;
    keep: number;
    dispose: number;
  };
}

export default function PublicReviewPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [photoIndices, setPhotoIndices] = useState<Record<string, number>>({});
  const [noteEditing, setNoteEditing] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    fetchData();
  }, [params.token]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/public/inventory/${params.token}`);
      if (!res.ok) {
        setError("This review link is invalid or has expired.");
        return;
      }
      const d = await res.json();
      setData(d);
      if (d.review.status === "completed") {
        setSubmitted(true);
      }
    } catch {
      setError("Failed to load review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecide = async (itemId: string, status: "keep" | "dispose", note?: string) => {
    setDecidingId(itemId);
    try {
      const res = await fetch(`/api/public/inventory/${params.token}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status, customerNote: note || null }),
      });
      if (res.ok) {
        setData((prev) => {
          if (!prev) return prev;
          const updated = prev.items.map((item) =>
            item.id === itemId ? { ...item, status, customerNote: note || item.customerNote } : item
          );
          return {
            ...prev,
            items: updated,
            stats: {
              total: updated.length,
              pending: updated.filter((i) => i.status === "pending").length,
              keep: updated.filter((i) => i.status === "keep").length,
              dispose: updated.filter((i) => i.status === "dispose").length,
            },
          };
        });
      }
    } catch (err) {
      console.error("Decision failed:", err);
    } finally {
      setDecidingId(null);
      setNoteEditing(null);
    }
  };

  const handleSubmit = async () => {
    if (!data || data.stats.pending > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/inventory/${params.token}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit");
      }
    } catch {
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const nextPhoto = (itemId: string, maxIdx: number) => {
    setPhotoIndices((prev) => ({
      ...prev,
      [itemId]: Math.min((prev[itemId] || 0) + 1, maxIdx),
    }));
  };

  const prevPhoto = (itemId: string) => {
    setPhotoIndices((prev) => ({
      ...prev,
      [itemId]: Math.max((prev[itemId] || 0) - 1, 0),
    }));
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-sm">
          <Package size={40} className="mx-auto mb-4 text-slate-300" />
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Review Not Found</h1>
          <p className="text-sm text-slate-500">{error || "This review link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-sm">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Thank You!</h1>
          <p className="text-sm text-slate-500 mb-6">
            Your content inventory decisions have been submitted. Our team will process your selections.
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <div>
              <p className="text-2xl font-bold text-green-600">{data.stats.keep}</p>
              <p className="text-slate-500">Keep</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{data.stats.dispose}</p>
              <p className="text-slate-500">Dispose</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#1B3A2D] text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-[#7BC143] text-xs font-medium tracking-wide uppercase mb-1">{process.env.NEXT_PUBLIC_COMPANY_SHORT || "Xtract Environmental"}</p>
          <h1 className="text-lg font-bold">{data.project.name}</h1>
          {data.project.address && (
            <p className="text-slate-300 text-sm mt-1">{data.project.address}</p>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {data.review.customerName ? `Hi ${data.review.customerName}, ` : ""}
            Please review each item below and select <strong className="text-green-700">Keep</strong> if you want the item returned, or <strong className="text-red-700">Dispose</strong> to authorize its disposal.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-500">
            {data.stats.total - data.stats.pending} of {data.stats.total} items reviewed
          </span>
          <div className="flex gap-3 text-xs">
            <span className="text-green-600 font-medium">{data.stats.keep} keep</span>
            <span className="text-red-600 font-medium">{data.stats.dispose} dispose</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${data.stats.total > 0 ? ((data.stats.total - data.stats.pending) / data.stats.total) * 100 : 0}%` }}
          />
        </div>

        {/* Items */}
        <div className="space-y-4">
          {data.items.map((item) => {
            const photoIdx = photoIndices[item.id] || 0;
            const isDeciding = decidingId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-colors ${
                  item.status === "keep"
                    ? "border-green-200"
                    : item.status === "dispose"
                    ? "border-red-200"
                    : "border-slate-200"
                }`}
              >
                {/* Photo Carousel */}
                {item.photos.length > 0 && (
                  <div className="relative bg-slate-100">
                    <img
                      src={item.photos[photoIdx]?.url}
                      alt={item.description}
                      className="w-full h-56 object-contain"
                    />
                    {item.photos.length > 1 && (
                      <>
                        <button
                          onClick={() => prevPhoto(item.id)}
                          disabled={photoIdx === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center disabled:opacity-30"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => nextPhoto(item.id, item.photos.length - 1)}
                          disabled={photoIdx === item.photos.length - 1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center disabled:opacity-30"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {item.photos.map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${idx === photoIdx ? "bg-white" : "bg-white/40"}`}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Status overlay */}
                    {item.status !== "pending" && (
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === "keep" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                      }`}>
                        {item.status === "keep" ? "KEEP" : "DISPOSE"}
                      </div>
                    )}
                  </div>
                )}

                {/* Item Details */}
                <div className="p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1">
                      {(item.brand || item.model) && (
                        <p className="text-xs text-slate-500 font-medium">
                          {[item.brand, item.model].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <p className="text-sm text-slate-800 mt-0.5">{item.description}</p>
                      {item.location && (
                        <p className="text-xs text-slate-400 mt-1">Location: {item.location}</p>
                      )}
                    </div>
                  </div>

                  {/* Customer Note */}
                  {noteEditing === item.id ? (
                    <div className="mb-3">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a note (optional)..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        autoFocus
                      />
                    </div>
                  ) : item.customerNote ? (
                    <div className="mb-3 p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-600"><strong>Your note:</strong> {item.customerNote}</p>
                    </div>
                  ) : null}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (noteEditing === item.id) {
                          handleDecide(item.id, "keep", noteText);
                        } else {
                          handleDecide(item.id, "keep");
                        }
                      }}
                      disabled={isDeciding}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        item.status === "keep"
                          ? "bg-green-500 text-white"
                          : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                      }`}
                    >
                      {isDeciding ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Keep
                    </button>
                    <button
                      onClick={() => {
                        if (noteEditing === item.id) {
                          handleDecide(item.id, "dispose", noteText);
                        } else {
                          handleDecide(item.id, "dispose");
                        }
                      }}
                      disabled={isDeciding}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        item.status === "dispose"
                          ? "bg-red-500 text-white"
                          : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                      }`}
                    >
                      {isDeciding ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Dispose
                    </button>
                    {!noteEditing && (
                      <button
                        onClick={() => {
                          setNoteEditing(item.id);
                          setNoteText(item.customerNote || "");
                        }}
                        className="w-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Add a note"
                      >
                        <MessageSquare size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-0 bg-slate-50 pt-4 pb-8 mt-6">
          <button
            onClick={handleSubmit}
            disabled={submitting || data.stats.pending > 0}
            className="w-full py-4 rounded-2xl text-sm font-bold transition-colors disabled:opacity-40 bg-[#1B3A2D] text-white hover:bg-[#264a3a]"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : data.stats.pending > 0 ? (
              `${data.stats.pending} item${data.stats.pending !== 1 ? "s" : ""} still need a decision`
            ) : (
              "Submit Decisions"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
