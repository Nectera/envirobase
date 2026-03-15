import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Shield, Plus, ChevronRight } from "lucide-react";
import { getTranslation, type Language } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function PsiJhaSpaListPage() {
  const language: Language = "en";
  const t = (key: string) => getTranslation(language, key);
  const items = await prisma.psiJhaSpa.findMany({ include: { project: true } });

  // Group by project
  const groups = new Map<string, { project: any; items: any[] }>();
  for (const item of items) {
    const key = item.projectId;
    if (!groups.has(key)) groups.set(key, { project: item.project, items: [] });
    groups.get(key)!.items.push(item);
  }

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    reviewed: "bg-green-100 text-green-800",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("psiJhaSpa.title")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("psiJhaSpa.subtitle")}</p>
        </div>
        <Link href="/psi-jha-spa/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
          <Plus size={16} /> {t("psiJhaSpa.newForm")}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Shield size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">{t("psiJhaSpa.noForms")}</h3>
          <p className="text-sm text-slate-500 mt-1">{t("psiJhaSpa.noFormsDescription")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([projId, group]) => (
            <div key={projId} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link href={`/projects/${projId}`} className="font-semibold text-sm text-slate-800 hover:text-indigo-600">
                    {group.project?.name || "Unknown Project"}
                  </Link>
                  <span className="text-xs text-slate-400">{group.items.length} forms</span>
                </div>
                <Link href={`/psi-jha-spa/new?projectId=${projId}`}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  <Plus size={12} /> New
                </Link>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">{t("common.date")}</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">{t("common.time")}</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">{t("common.supervisor")}</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">{t("psiJhaSpa.taskSteps")}</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">{t("psiJhaSpa.maxRisk")}</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">{t("common.status")}</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {group.items.map((item: any) => {
                    const maxRisk = item.taskSteps?.length
                      ? Math.max(...item.taskSteps.map((s: any) => s.riskRating || 0))
                      : 0;
                    const riskColor = maxRisk >= 8 ? "bg-red-100 text-red-700" : maxRisk >= 6 ? "bg-orange-100 text-orange-700" : maxRisk === 5 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-900 whitespace-nowrap">
                          {new Date(item.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{item.time || "—"}</td>
                        <td className="px-4 py-2 text-slate-600">{item.supervisorName || "—"}</td>
                        <td className="px-4 py-2 text-slate-600">{item.taskSteps?.length || 0} steps</td>
                        <td className="px-4 py-2">
                          {maxRisk > 0 ? (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${riskColor}`}>{maxRisk}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[item.status] || "bg-slate-100"}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <Link href={`/psi-jha-spa/${item.id}`} className="text-slate-400 hover:text-indigo-600">
                            <ChevronRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
