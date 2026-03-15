import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FileText, Plus, ChevronRight } from "lucide-react";
import { getTranslation, type Language } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function CertificateListPage() {
  const language: Language = "en";
  const t = (key: string) => getTranslation(language, key);
  const certs = await prisma.certificateOfCompletion.findMany({
    include: { project: true },
  });

  // Group by project
  const groups = new Map<string, { project: any; items: any[] }>();
  for (const cert of certs) {
    const key = cert.projectId;
    if (!groups.has(key)) groups.set(key, { project: cert.project, items: [] });
    groups.get(key)!.items.push(cert);
  }

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    signed: "bg-green-100 text-green-800",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("certificate.title")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("certificate.subtitle")}</p>
        </div>
        <Link href="/certificate-of-completion/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
          <Plus size={16} /> {t("certificate.newCertificate")}
        </Link>
      </div>

      {certs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <FileText size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">{t("certificate.noCertificates")}</h3>
          <p className="text-sm text-slate-500 mt-1">{t("certificate.noCertificatesDescription")}</p>
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
                  <span className="text-xs text-slate-400">{group.items.length} certificates</span>
                </div>
                <Link href={`/certificate-of-completion/new?projectId=${projId}`}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  <Plus size={12} /> New
                </Link>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">{t("certificate.workSite")}</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">{t("certificate.jobNumber")}</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">{t("certificate.demobilizationDate")}</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">{t("common.status")}</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {group.items.map((cert: any) => (
                    <tr key={cert.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-900 font-medium max-w-xs truncate">
                        {cert.workSiteAddress || "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{cert.jobNumber || "—"}</td>
                      <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                        {cert.demobilizationDate
                          ? new Date(cert.demobilizationDate + "T12:00:00").toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[cert.status] || "bg-slate-100"}`}>
                          {cert.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/certificate-of-completion/${cert.id}`} className="text-slate-400 hover:text-indigo-600">
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
