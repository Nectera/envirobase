"use client";

import Link from "next/link";
import { useTranslation } from "@/components/LanguageProvider";
import ConsultationActions from "./ConsultationActions";

interface Consultation {
  id: string;
  customerName: string | null;
  address?: string;
  city?: string;
  status: string;
  totalCost?: number | null;
  createdAt: string;
  estimateId?: string | null;
}

export default function ConsultationEstimatesView({
  consultations,
}: {
  consultations: Consultation[];
}) {
  const { t } = useTranslation();

  const statusColor: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    costed: "bg-blue-100 text-blue-700",
    converted: "bg-emerald-100 text-emerald-700",
    post_cost: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">
        {t("estimates.consultationEstimatesSection")}
      </h2>
      <div className="bg-white rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 rounded-t-lg">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                {t("estimates.customer")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                {t("estimates.address")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                {t("common.status")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                {t("estimates.totalCost")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                {t("common.date")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase w-32">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {consultations.map((c: any) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {c.customerName || "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {[c.address, c.city].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      statusColor[c.status] || "bg-slate-100"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">
                  {c.totalCost
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(c.totalCost)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {new Date(c.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 items-center justify-end">
                    {c.status === "converted" && c.estimateId && (
                      <Link
                        href={`/invoices/${c.estimateId}`}
                        className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                      >
                        {t("estimates.invoiceArrow")}
                      </Link>
                    )}
                    <Link
                      href={`/estimates/consultation/${c.id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                    >
                      {t("estimates.viewArrow")}
                    </Link>
                    <ConsultationActions
                      id={c.id}
                      customerName={c.customerName || t("estimates.untitled")}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
