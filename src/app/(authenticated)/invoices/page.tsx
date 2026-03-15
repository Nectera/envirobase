import { prisma } from "@/lib/prisma";
import Link from "next/link";
import InvoiceActions from "./InvoiceActions";

export const dynamic = "force-dynamic";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-slate-200 text-slate-500",
};

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    include: { company: true, contact: true },
  });

  const totalDraft = invoices.filter((i: any) => i.status === "draft").reduce((s: number, i: any) => s + (i.total || 0), 0);
  const totalSent = invoices.filter((i: any) => i.status === "sent").reduce((s: number, i: any) => s + (i.total || 0), 0);
  const totalPaid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.paidAmount || i.total || 0), 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">{invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}</p>
        </div>
      </div>

      {/* Summary Cards */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Draft</p>
            <p className="text-xl font-bold text-slate-700 mt-1">{formatCurrency(totalDraft)}</p>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-medium text-blue-500 uppercase">Outstanding</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totalSent)}</p>
          </div>
          <div className="bg-white border border-emerald-200 rounded-lg p-4">
            <p className="text-xs font-medium text-emerald-500 uppercase">Collected</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No invoices yet. Convert a consultation estimate to create your first invoice.</p>
          <Link href="/estimates" className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Go to Estimates →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 rounded-t-lg">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Margin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Due Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{inv.customerName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusColors[inv.status] || "bg-slate-100"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-medium text-emerald-600">{(inv.profitMargin || 0).toFixed(0)}%</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 items-center justify-end">
                      <Link href={`/invoices/${inv.id}`} className="text-indigo-600 hover:text-indigo-700 text-xs font-medium">
                        View →
                      </Link>
                      <InvoiceActions id={inv.id} invoiceNumber={inv.invoiceNumber} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
