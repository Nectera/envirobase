"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logger } from "@/lib/logger";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  X,
  Send,
  Clock,
  FileText,
  Mail,
  Loader2,
  XCircle,
} from "lucide-react";
import PandaDocSend from "@/components/PandaDocSend";
import PandaDocStatus from "@/components/PandaDocStatus";

const STATUS_BADGES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Activity = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
};

type Estimate = {
  id: string;
  estimateNumber: string;
  status: string;
  companyId: string;
  leadId?: string | null;
  contactId?: string | null;
  scope?: string | null;
  lineItems?: any[];
  laborHours?: number | null;
  materialsCost?: number | null;
  markup?: number | null;
  markupPercent?: number | null;
  subtotal?: number;
  total?: number;
  validUntil?: string | null;
  sentDate?: string | null;
  acceptedDate?: string | null;
  rejectedDate?: string | null;
  createdAt: string;
  company?: { id: string; name: string } | null;
  contact?: { id: string; firstName: string; lastName?: string | null; name?: string; email?: string | null } | null;
  lead?: { id: string; projectType?: string; email?: string | null; firstName?: string | null; lastName?: string | null } | null;
};

export default function EstimateDetail({
  estimate,
  activities,
}: {
  estimate: Estimate;
  activities: Activity[];
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [showPandaDoc, setShowPandaDoc] = useState(false);

  // Follow-up state
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpSending, setFollowUpSending] = useState(false);

  // Fetch follow-ups when estimate is in "sent" status
  useEffect(() => {
    if (estimate.status === "sent") {
      setFollowUpLoading(true);
      fetch(`/api/estimate-follow-ups?estimateId=${estimate.id}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setFollowUps(Array.isArray(data) ? data : []))
        .catch(() => setFollowUps([]))
        .finally(() => setFollowUpLoading(false));
    }
  }, [estimate.id, estimate.status]);

  const handleStartFollowUp = async () => {
    setFollowUpSending(true);
    try {
      // Resolve client email: contact > lead > company
      const clientEmail =
        estimate.contact?.email || estimate.lead?.email || null;
      const clientName =
        estimate.contact?.firstName
          ? `${estimate.contact.firstName}${estimate.contact.lastName ? " " + estimate.contact.lastName : ""}`
          : estimate.lead?.firstName
            ? `${estimate.lead.firstName}${estimate.lead.lastName ? " " + estimate.lead.lastName : ""}`
            : estimate.company?.name || null;

      if (!clientEmail) {
        alert("No email address found for this estimate's contact or lead.");
        return;
      }

      const res = await fetch("/api/estimate-follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateId: estimate.id,
          clientName,
          clientEmail,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to start follow-up sequence");
        return;
      }

      const created = await res.json();
      setFollowUps((prev) => [created, ...prev]);
    } catch {
      alert("Failed to start follow-up sequence");
    } finally {
      setFollowUpSending(false);
    }
  };

  const handleCancelFollowUp = async (id: string) => {
    try {
      const res = await fetch(`/api/estimate-follow-ups/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Manually cancelled" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFollowUps((prev) => prev.map((fu) => (fu.id === id ? updated : fu)));
      }
    } catch {
      // ignore
    }
  };

  // Normalize line items: handle both qty/quantity and ensure totals
  const rawLineItems = estimate.lineItems || [];
  const lineItems = rawLineItems.map((item: any) => {
    const qty = item.quantity ?? item.qty ?? 0;
    const unitPrice = item.unitPrice ?? 0;
    const total = item.total ?? qty * unitPrice;
    return { ...item, quantity: qty, unitPrice, total };
  });
  // Compute subtotal from line items if not stored
  const computedSubtotal = lineItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
  const subtotal = estimate.subtotal || computedSubtotal;
  const markup = estimate.markup ?? estimate.markupPercent ?? 0;
  const markupAmount = (subtotal * markup) / 100;
  const total = estimate.total || subtotal + markupAmount;
  const laborHours = estimate.laborHours || 0;
  const materialsCost = estimate.materialsCost || 0;

  const canSend = estimate.status === "draft";
  const canAccept = estimate.status === "sent";
  const canReject = estimate.status === "sent";

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };

      if (newStatus === "sent") {
        updateData.sentDate = new Date().toISOString().split("T")[0];
      } else if (newStatus === "accepted") {
        updateData.acceptedDate = new Date().toISOString().split("T")[0];
      } else if (newStatus === "rejected") {
        updateData.rejectedDate = new Date().toISOString().split("T")[0];
      }

      await fetch(`/api/estimates/${estimate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      // Create activity log entry
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentType: "estimate",
          parentId: estimate.id,
          type: "status_change",
          description: `Estimate status changed to ${newStatus}`,
        }),
      });

      // Auto-start follow-up sequence when estimate is sent
      if (newStatus === "sent") {
        const clientEmail = estimate.contact?.email || estimate.lead?.email || null;
        const clientName = estimate.contact?.firstName
          ? `${estimate.contact.firstName}${estimate.contact.lastName ? " " + estimate.contact.lastName : ""}`
          : estimate.lead?.firstName
            ? `${estimate.lead.firstName}${estimate.lead.lastName ? " " + estimate.lead.lastName : ""}`
            : estimate.company?.name || null;

        if (clientEmail) {
          fetch("/api/estimate-follow-ups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              estimateId: estimate.id,
              clientName,
              clientEmail,
            }),
          }).catch(() => {}); // Fire and forget
        }
      }

      router.refresh();
    } catch (error) {
      logger.error("Error updating estimate:", { error: String(error) });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/estimates"
          className="text-sm text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-3"
        >
          <ArrowLeft size={14} /> Back to Estimates
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {estimate.estimateNumber}
            </h1>
            <p className="text-sm text-slate-500">{estimate.company?.name}</p>
            {estimate.lead && (
              <p className="text-xs text-slate-400 mt-1">
                Project Type: {estimate.lead.projectType}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold px-3 py-1 rounded ${
                STATUS_BADGES[estimate.status] || "bg-slate-100 text-slate-700"
              }`}
            >
              {STATUS_LABELS[estimate.status] || estimate.status}
            </span>
            {(estimate as any).pandadocDocumentId && (
              <PandaDocStatus documentId={(estimate as any).pandadocDocumentId} compact />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Left column - Details */}
        <div className="col-span-2 space-y-6">
          {/* Scope Section */}
          {estimate.scope && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">Scope of Work</h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{estimate.scope}</p>
            </div>
          )}

          {/* Line Items */}
          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-900">Line Items</h2>
            </div>
            {lineItems.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">
                      Description
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">
                      Unit
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">
                      Unit Price
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-800">{item.description}</td>
                      <td className="px-4 py-2 text-right text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{item.unit || "—"}</td>
                      <td className="px-4 py-2 text-right text-slate-800">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-slate-800">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-4 text-center text-slate-400 text-sm">
                No line items
              </div>
            )}
          </div>

          {/* Labor & Materials */}
          {(laborHours > 0 || materialsCost > 0) && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Labor & Materials</h2>
              {laborHours > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Labor Hours:</span>
                  <span className="text-slate-900">{laborHours} hrs</span>
                </div>
              )}
              {materialsCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Materials Cost:</span>
                  <span className="text-slate-900">{formatCurrency(materialsCost)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column - Summary */}
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal:</span>
                <span className="text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              {markup > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Markup ({markup}%):</span>
                  <span className="text-slate-900">
                    {formatCurrency(markupAmount)}
                  </span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-medium text-slate-900">
                <span>Total:</span>
                <span className="text-base">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Dates Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Dates</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Created</p>
                <p className="text-slate-900">{formatDate(estimate.createdAt)}</p>
              </div>
              {estimate.sentDate && (
                <div>
                  <p className="text-slate-500 text-xs">Sent</p>
                  <p className="text-slate-900">{formatDate(estimate.sentDate)}</p>
                </div>
              )}
              {estimate.validUntil && (
                <div>
                  <p className="text-slate-500 text-xs">Valid Until</p>
                  <p className="text-slate-900">{formatDate(estimate.validUntil)}</p>
                </div>
              )}
              {estimate.acceptedDate && (
                <div>
                  <p className="text-slate-500 text-xs">Accepted</p>
                  <p className="text-slate-900">{formatDate(estimate.acceptedDate)}</p>
                </div>
              )}
              {estimate.rejectedDate && (
                <div>
                  <p className="text-slate-500 text-xs">Rejected</p>
                  <p className="text-slate-900">{formatDate(estimate.rejectedDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Follow-Up Sequence */}
          {estimate.status === "sent" && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Mail size={14} className="text-blue-600" /> Follow-Up Emails
              </h2>

              {followUpLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 size={12} className="animate-spin" /> Loading...
                </div>
              ) : followUps.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    No follow-up sequence started. Start a 3-touch email drip to
                    check in with the client.
                  </p>
                  <button
                    onClick={handleStartFollowUp}
                    disabled={followUpSending}
                    className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {followUpSending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    {followUpSending ? "Starting..." : "Start Follow-Up Sequence"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {followUps.map((fu: any) => (
                    <div
                      key={fu.id}
                      className="border border-slate-100 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">
                          {fu.clientEmail}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            fu.status === "active"
                              ? "bg-blue-100 text-blue-700"
                              : fu.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {fu.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((touch) => (
                          <div
                            key={touch}
                            className={`h-1.5 flex-1 rounded-full ${
                              touch <= fu.touchesSent
                                ? "bg-blue-500"
                                : "bg-slate-200"
                            }`}
                          />
                        ))}
                        <span className="text-[10px] text-slate-500 ml-1">
                          {fu.touchesSent}/3
                        </span>
                      </div>
                      {fu.nextTouchAt && fu.status === "active" && (
                        <p className="text-[10px] text-slate-500">
                          Next email:{" "}
                          {new Date(fu.nextTouchAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}
                      {fu.status === "active" && (
                        <button
                          onClick={() => handleCancelFollowUp(fu.id)}
                          className="text-[10px] text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                          <XCircle size={10} /> Cancel sequence
                        </button>
                      )}
                    </div>
                  ))}
                  {/* Allow starting a new one if all existing are completed/cancelled */}
                  {followUps.every(
                    (fu: any) =>
                      fu.status === "completed" || fu.status === "cancelled"
                  ) && (
                    <button
                      onClick={handleStartFollowUp}
                      disabled={followUpSending}
                      className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {followUpSending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}
                      Start New Sequence
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
            {canSend && (
              <button
                onClick={() => handleStatusUpdate("sent")}
                disabled={updating}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <Send size={16} /> Send Estimate
              </button>
            )}
            {canSend && (
              <button
                onClick={() => setShowPandaDoc(true)}
                className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <FileText size={16} /> Send via PandaDoc
              </button>
            )}
            {canAccept && (
              <button
                onClick={() => handleStatusUpdate("accepted")}
                disabled={updating}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <Check size={16} /> Accept
              </button>
            )}
            {canReject && (
              <button
                onClick={() => handleStatusUpdate("rejected")}
                disabled={updating}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-sm rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <X size={16} /> Reject
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      {activities.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Activity Log</h2>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3 text-sm">
                <div className="mt-1">
                  <Clock size={14} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-900">{activity.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(activity.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PandaDocSend
        isOpen={showPandaDoc}
        onClose={() => setShowPandaDoc(false)}
        estimateId={estimate.id}
        contactEmail={estimate.contact?.firstName ? "" : ""}
        contactName={estimate.contact ? [estimate.contact.firstName, estimate.contact.lastName].filter(Boolean).join(" ") : ""}
        parentType="estimate"
        parentId={estimate.id}
        documentName={`${estimate.estimateNumber} - ${estimate.company?.name || "Proposal"}`}
      />
    </div>
  );
}
