"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logger } from "@/lib/logger";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Printer,
  Edit2,
  DollarSign,
  FileText,
  AlertTriangle,
  Scissors,
  X,
} from "lucide-react";

interface LineItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  consultationEstimateId: string | null;
  projectId: string | null;
  customerName: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerZip: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  lineItems: LineItem[];
  subtotal: number;
  markupPercent: number;
  markupAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  internalCost: number;
  profitMargin: number;
  scope: string;
  notes: string;
  internalNotes: string;
  paymentInstructions: string;
  sentDate: string | null;
  paidDate: string | null;
  paidAmount: number;
  createdAt: string;
  updatedAt: string;
  consultationEstimate?: any;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-slate-100 text-slate-700", label: "Draft" },
  sent: { color: "bg-blue-100 text-blue-700", label: "Sent" },
  paid: { color: "bg-emerald-100 text-emerald-700", label: "Paid" },
  overdue: { color: "bg-red-100 text-red-700", label: "Overdue" },
  void: { color: "bg-slate-200 text-slate-500", label: "Void" },
};

const paymentTermsLabels: Record<string, string> = {
  due_on_receipt: "Due on Receipt",
  net_15: "Net 15",
  net_30: "Net 30",
};

export default function InvoiceDetail({ data }: { data: InvoiceData }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showInternalCosts, setShowInternalCosts] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    customerEmail: data.customerEmail || "",
    customerPhone: data.customerPhone || "",
    notes: data.notes || "",
    internalNotes: data.internalNotes || "",
    scope: data.scope || "",
  });

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const [isSplitting, setIsSplitting] = useState(false);
  const [qbConnected, setQbConnected] = useState(false);
  const [qbSendResult, setQbSendResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Check QB connection status on mount
  useState(() => {
    fetch("/api/quickbooks/status")
      .then((r) => r.json())
      .then((d) => setQbConnected(d.connected || false))
      .catch(() => {});
  });

  const statusInfo = statusConfig[data.status] || statusConfig.draft;

  const handleStatusUpdate = async (newStatus: string, extra?: any) => {
    setIsUpdating(true);
    try {
      const body: any = { status: newStatus, ...extra };
      const response = await fetch(`/api/invoices/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to update");
      router.refresh();
    } catch (error) {
      logger.error("Error updating invoice:", { error: String(error) });
      alert("Failed to update invoice.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/invoices/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (!response.ok) throw new Error("Failed to save");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      logger.error("Error saving:", { error: String(error) });
      alert("Failed to save changes.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkSent = async () => {
    setIsUpdating(true);
    setQbSendResult(null);
    try {
      const body: any = { status: "sent", sentDate: new Date().toISOString().split("T")[0] };
      const response = await fetch(`/api/invoices/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to update");
      const result = await response.json();
      // Show QB sync result if applicable
      if (result.qbResult) {
        setQbSendResult(result.qbResult);
      }
      router.refresh();
    } catch (error) {
      logger.error("Error sending invoice:", { error: String(error) });
      alert("Failed to send invoice.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkPaid = () => {
    handleStatusUpdate("paid", {
      paidDate: new Date().toISOString().split("T")[0],
      paidAmount: data.total,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSplitInvoice = async () => {
    setIsSplitting(true);
    try {
      const response = await fetch("/api/invoices/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: data.id,
          depositPercent: splitPercent,
        }),
      });
      if (!response.ok) throw new Error("Failed to split invoice");
      const result = await response.json();
      setShowSplitModal(false);
      router.push(`/invoices/${result.depositInvoice.id}`);
    } catch (error) {
      logger.error("Error splitting invoice:", { error: String(error) });
      alert("Failed to split invoice. Please try again.");
    } finally {
      setIsSplitting(false);
    }
  };

  const depositAmount = data.total * (splitPercent / 100);
  const balanceAmount = data.total - depositAmount;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 print:mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/invoices"
              className="text-indigo-600 hover:text-indigo-700 transition-colors print:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              {data.invoiceNumber}
            </h1>
            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="text-sm text-slate-600">{data.customerName}</p>
          {(data as any).qbInvoiceId && (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full mt-1">
              <CheckCircle className="w-3 h-3" /> QB Synced (#{(data as any).qbInvoiceId})
            </span>
          )}
          {(data as any).qbSyncStatus === "failed" && (
            <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full mt-1">
              <AlertTriangle className="w-3 h-3" /> QB Sync Failed: {(data as any).qbSyncError}
            </span>
          )}
          {qbSendResult && !qbSendResult.success && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              QuickBooks sync failed: {qbSendResult.error}. Invoice was marked as sent but not synced to QB.
            </div>
          )}
          {qbSendResult && qbSendResult.success && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Invoice sent and synced to QuickBooks successfully!
            </div>
          )}
        </div>

        <div className="flex gap-2 print:hidden">
          {data.status === "draft" && (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => setShowSplitModal(true)}
                className="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <Scissors className="w-3.5 h-3.5" />
                Split
              </button>
              <button
                onClick={handleMarkSent}
                disabled={isUpdating}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition flex items-center gap-1.5 ${
                  qbConnected ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                {isUpdating ? "Sending..." : qbConnected ? "Send via QuickBooks" : "Mark Sent"}
              </button>
            </>
          )}
          {data.status === "sent" && (
            <>
              <button
                onClick={() => setShowSplitModal(true)}
                className="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <Scissors className="w-3.5 h-3.5" />
                Split
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Paid
              </button>
            </>
          )}
          <button
            onClick={handlePrint}
            className="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Edit Form (if editing) */}
      {isEditing && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-6 mb-6 print:hidden">
          <h3 className="font-semibold text-slate-900 mb-4">Edit Invoice Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer Email</label>
              <input
                type="email"
                value={editData.customerEmail}
                onChange={(e) => setEditData({ ...editData, customerEmail: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer Phone</label>
              <input
                type="tel"
                value={editData.customerPhone}
                onChange={(e) => setEditData({ ...editData, customerPhone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">Scope of Work</label>
            <textarea
              value={editData.scope}
              onChange={(e) => setEditData({ ...editData, scope: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer Notes</label>
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Internal Notes</label>
              <textarea
                value={editData.internalNotes}
                onChange={(e) => setEditData({ ...editData, internalNotes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={isUpdating}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Invoice Document */}
      <div className="border border-slate-200 rounded-lg bg-white mb-6 overflow-hidden">
        {/* Invoice Header */}
        <div className="bg-slate-50 p-6 border-b border-slate-200">
          <div className="flex justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{process.env.NEXT_PUBLIC_COMPANY_NAME || "Xtract Environmental Services"}</h2>
              <p className="text-sm text-slate-600">{process.env.NEXT_PUBLIC_COMPANY_LOCATION || "Fort Collins, CO"}</p>
              <p className="text-sm text-slate-600">{process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@xtractes.com"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Invoice Number</p>
              <p className="text-lg font-bold font-mono text-slate-900">{data.invoiceNumber}</p>
              <div className="mt-2 space-y-1 text-sm">
                <p><span className="text-slate-500">Issue Date:</span> <span className="font-medium">{formatDate(data.issueDate)}</span></p>
                <p><span className="text-slate-500">Due Date:</span> <span className="font-medium">{formatDate(data.dueDate)}</span></p>
                <p><span className="text-slate-500">Terms:</span> <span className="font-medium">{paymentTermsLabels[data.paymentTerms] || data.paymentTerms}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="p-6 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bill To</p>
          <p className="font-semibold text-slate-900">{data.customerName}</p>
          <p className="text-sm text-slate-600">{data.customerAddress}</p>
          <p className="text-sm text-slate-600">{data.customerCity}, {data.customerState} {data.customerZip}</p>
          {data.customerEmail && <p className="text-sm text-slate-600 mt-1">{data.customerEmail}</p>}
          {data.customerPhone && <p className="text-sm text-slate-600">{data.customerPhone}</p>}
        </div>

        {/* Scope */}
        {data.scope && (
          <div className="p-6 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Scope of Work</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.scope}</p>
          </div>
        )}

        {/* Line Items */}
        <div className="p-6 border-b border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 font-semibold text-slate-700">Description</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-700">Qty</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-700">Unit Price</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data.lineItems || []).map((item: LineItem) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-3 px-2">
                    <p className="text-slate-800 font-medium">{item.description}</p>
                    <p className="text-xs text-slate-400 capitalize">{item.category}</p>
                  </td>
                  <td className="py-3 px-2 text-right text-slate-600">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-2 text-right text-slate-600">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-3 px-2 text-right font-semibold text-slate-800">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="p-6">
          <div className="ml-auto max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(data.subtotal)}</span>
            </div>
            {data.markupAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Markup ({data.markupPercent}%)</span>
                <span className="font-medium">{formatCurrency(data.markupAmount)}</span>
              </div>
            )}
            {data.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax ({data.taxPercent}%)</span>
                <span className="font-medium">{formatCurrency(data.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-3">
              <span className="font-bold text-slate-900 text-lg">Total</span>
              <span className="font-bold text-slate-900 text-lg">{formatCurrency(data.total)}</span>
            </div>
            {data.status === "paid" && data.paidAmount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span className="font-medium">Paid</span>
                <span className="font-medium">{formatCurrency(data.paidAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes & Payment Instructions */}
        {(data.notes || data.paymentInstructions) && (
          <div className="p-6 border-t border-slate-200 bg-slate-50">
            {data.notes && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}
            {data.paymentInstructions && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Payment Instructions</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.paymentInstructions}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Internal Cost Analysis (not printed) */}
      <div className="print:hidden">
        <button
          onClick={() => setShowInternalCosts(!showInternalCosts)}
          className="text-sm text-slate-500 hover:text-slate-700 font-medium mb-3 flex items-center gap-1.5"
        >
          <DollarSign className="w-3.5 h-3.5" />
          {showInternalCosts ? "Hide" : "Show"} Internal Cost Analysis
        </button>

        {showInternalCosts && (
          <div className="border border-slate-200 rounded-lg p-6 bg-white mb-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Internal Only — Not Shown to Customer
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Internal Cost</span>
                  <span className="font-medium">{formatCurrency(data.internalCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Invoice Total</span>
                  <span className="font-medium">{formatCurrency(data.total)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-900">Gross Profit</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(data.total - data.internalCost)}</span>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Markup Applied</span>
                  <span className="font-medium">{data.markupPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Profit Margin</span>
                  <span className="font-bold text-emerald-600">{(data.profitMargin || 0).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {data.consultationEstimateId && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Link
                  href={`/estimates/consultation/${data.consultationEstimateId}`}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Original Consultation Estimate
                </Link>
              </div>
            )}

            {data.internalNotes && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Internal Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.internalNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Split Invoice Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Scissors className="w-5 h-5" />
                Split Invoice
              </h3>
              <button
                onClick={() => setShowSplitModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Split <span className="font-semibold">{data.invoiceNumber}</span> into a deposit invoice and a balance invoice. The original will be voided.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Deposit Percentage: <span className="font-bold text-indigo-600">{splitPercent}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={splitPercent}
                onChange={(e) => setSplitPercent(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex gap-2 mt-3">
                {[25, 50, 60, 75].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setSplitPercent(pct)}
                    className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
                      splitPercent === pct
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Original Total</span>
                <span className="font-medium">{formatCurrency(data.total)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                <span className="text-slate-600">Deposit ({splitPercent}%)</span>
                <span className="font-bold text-indigo-600">{formatCurrency(depositAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Balance ({100 - splitPercent}%)</span>
                <span className="font-bold text-slate-900">{formatCurrency(balanceAmount)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSplitModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSplitInvoice}
                disabled={isSplitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Scissors className="w-3.5 h-3.5" />
                {isSplitting ? "Splitting..." : "Split Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="mb-8 print:hidden">
        <Link
          href="/invoices"
          className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
        >
          Back to invoices
        </Link>
      </div>
    </div>
  );
}
