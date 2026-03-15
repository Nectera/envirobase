import { prisma } from "@/lib/prisma";
import Link from "next/link";
import EstimatesTable from "./EstimatesTable";
import ConsultationActions from "./ConsultationActions";
import EstimatesHeader from "./EstimatesHeader";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin, isOffice } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function EstimatesPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role as string | undefined;
  const canViewPostCost = isAdmin(userRole) || isOffice(userRole);

  const estimates = await prisma.estimate.findMany({
    include: { company: true, lead: true, contact: true },
  });

  const allConsultations = await prisma.consultationEstimate.findMany();
  // Filter out post-cost estimates for non-admin/office users
  const consultations = canViewPostCost
    ? allConsultations
    : (allConsultations as any[]).filter((c: any) => !c.isPostCost);

  return (
    <div>
      <EstimatesHeader estimateCount={estimates.length} consultationCount={consultations.length} />

      {/* Consultation Estimates */}
      {consultations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Consultation Estimates</h2>
          <div className="bg-white rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 rounded-t-lg">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Total Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((c: any) => {
                  const statusColor: Record<string, string> = {
                    draft: "bg-slate-100 text-slate-700",
                    costed: "bg-blue-100 text-blue-700",
                    converted: "bg-emerald-100 text-emerald-700",
                    post_cost: "bg-orange-100 text-orange-700",
                  };
                  return (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{c.customerName || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{[c.address, c.city].filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusColor[c.status] || "bg-slate-100"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {c.totalCost ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(c.totalCost) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 items-center justify-end">
                          {c.status === "converted" && c.estimateId && (
                            <Link href={`/invoices/${c.estimateId}`} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">
                              Invoice →
                            </Link>
                          )}
                          <Link href={`/estimates/consultation/${c.id}`} className="text-indigo-600 hover:text-indigo-700 text-xs font-medium">
                            View →
                          </Link>
                          <ConsultationActions id={c.id} customerName={c.customerName || "Untitled"} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Standard Estimates */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Estimates</h2>
        <EstimatesTable estimates={estimates} />
      </div>
    </div>
  );
}
