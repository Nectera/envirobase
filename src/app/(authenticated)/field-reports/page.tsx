import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Plus, FileText, ChevronRight, AlertTriangle, FileDown, FolderOpen } from "lucide-react";
import { getTranslation, type Language } from "@/lib/translations";

export default async function FieldReportsPage() {
  const language: Language = "en";
  const t = (key: string) => getTranslation(language, key);
  const reports = await prisma.dailyFieldReport.findMany({
    include: { project: true },
  });

  // Group reports by project
  const byProject = new Map<string, { project: any; reports: any[] }>();
  for (const report of reports) {
    const pid = report.projectId;
    if (!byProject.has(pid)) {
      byProject.set(pid, { project: report.project, reports: [] });
    }
    byProject.get(pid)!.reports.push(report);
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
          <h1 className="text-xl font-bold text-slate-900">{t("fieldReports.title")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{reports.length} {reports.length === 1 ? t("fieldReports.report") : t("fieldReports.reports")} {t("fieldReports.across")} {byProject.size} project{byProject.size !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">{t("fieldReports.noReports")}</h3>
          <p className="text-sm text-slate-500 mt-1">{t("fieldReports.noReportsDescription")}</p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg"
          >
            <FolderOpen size={16} /> Go to Projects
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byProject.entries()).map(([pid, { project, reports: projectReports }]) => (
            <div key={pid} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    project?.type === "ASBESTOS" ? "bg-indigo-100 text-indigo-700" :
                    project?.type === "LEAD" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                  }`}>
                    {project?.type}
                  </span>
                  <Link href={`/projects/${pid}`} className="font-semibold text-sm text-slate-800 hover:text-indigo-600">
                    {project?.name || "Unknown Project"}
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{projectReports.length} report{projectReports.length !== 1 ? "s" : ""}</span>
                  <Link
                    href={`/field-reports/new?projectId=${pid}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg"
                  >
                    <Plus size={13} /> New
                  </Link>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-2 font-medium text-slate-500 text-xs">{t("common.date")}</th>
                    <th className="text-left px-5 py-2 font-medium text-slate-500 text-xs">{t("common.supervisor")}</th>
                    <th className="text-left px-5 py-2 font-medium text-slate-500 text-xs">{t("fieldReports.workDone")}</th>
                    <th className="text-left px-5 py-2 font-medium text-slate-500 text-xs">{t("fieldReports.safety")}</th>
                    <th className="text-left px-5 py-2 font-medium text-slate-500 text-xs">{t("common.status")}</th>
                    <th className="px-5 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {projectReports.map((report: any) => {
                    const hasSafetyEvent = report.incident || report.nearMiss || report.stopWork;
                    return (
                      <tr key={report.id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                          {new Date(report.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </td>
                        <td className="px-5 py-2.5 text-slate-600">{report.supervisorName || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-600 max-w-xs truncate">{report.workCompletedToday || "—"}</td>
                        <td className="px-5 py-2.5">
                          {hasSafetyEvent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              <AlertTriangle size={11} /> {t("fieldReports.flagged")}
                            </span>
                          ) : (
                            <span className="text-green-600 text-xs">{t("fieldReports.clear")}</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[report.status] || "bg-slate-100"}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2 justify-end">
                            <a href={`/api/field-reports/${report.id}/pdf`} className="text-slate-400 hover:text-indigo-600" title="Download PDF">
                              <FileDown size={15} />
                            </a>
                            <Link href={`/field-reports/${report.id}`} className="text-slate-400 hover:text-indigo-600">
                              <ChevronRight size={16} />
                            </Link>
                          </div>
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
