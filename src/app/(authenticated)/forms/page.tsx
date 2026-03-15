import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FileText, Shield, CheckSquare, Award, Stethoscope, ClipboardCheck, ChevronRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FormsHubPage() {
  const [fieldReportCount, psiCount, preAbatementCount, certCount, fitTestCount, postProjectCount] = await Promise.all([
    prisma.dailyFieldReport.count(),
    prisma.psiJhaSpa.count(),
    prisma.preAbatementInspection.count(),
    prisma.certificateOfCompletion.count(),
    prisma.respiratorFitTest.count(),
    prisma.postProjectInspection.count(),
  ]);

  const forms = [
    {
      href: "/field-reports",
      newHref: "/field-reports/new",
      label: "Daily Field Reports",
      description: "Daily project progress, safety events, equipment status, and shift reviews",
      icon: FileText,
      count: fieldReportCount,
      color: "bg-blue-50 text-blue-600",
    },
    {
      href: "/psi-jha-spa",
      newHref: "/psi-jha-spa/new",
      label: "PSI / JHA / SPA",
      description: "Pre-Shift Inspection, Job Hazard Analysis, and Safe Plan of Action",
      icon: Shield,
      count: psiCount,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      href: "/pre-abatement-inspection",
      newHref: "/pre-abatement-inspection/new",
      label: "Pre-Abatement Visual Inspection",
      description: "Containment, negative air, decon, and safety checklist before abatement begins",
      icon: CheckSquare,
      count: preAbatementCount,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      href: "/certificate-of-completion",
      newHref: "/certificate-of-completion/new",
      label: "Certificate of Completion",
      description: "Property owner sign-off confirming work completed to satisfaction",
      icon: Award,
      count: certCount,
      color: "bg-amber-50 text-amber-600",
    },
    {
      href: "/respirator-fit-test",
      newHref: "/respirator-fit-test/new",
      label: "Respirator Fit Test",
      description: "OSHA 29 CFR 1910.134 qualitative fit testing — yearly requirement per employee",
      icon: Stethoscope,
      count: fitTestCount,
      color: "bg-rose-50 text-rose-600",
    },
    {
      href: "/post-project-inspection",
      newHref: "/post-project-inspection/new",
      label: "Post Project Inspection",
      description: "PM closeout checklist — customer communication, cleanliness, organization, damages, demobilization",
      icon: ClipboardCheck,
      count: postProjectCount,
      color: "bg-teal-50 text-teal-600",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Forms</h1>
          <p className="text-sm text-slate-500 mt-1">All project and employee forms in one place</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.map((form) => {
          const Icon = form.icon;
          return (
            <div key={form.href} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-[#7BC143] transition group">
              <Link href={form.href} className="block p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${form.color}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-[#7BC143] transition">{form.label}</h3>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-[#7BC143]" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{form.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-400">{form.count} {form.count === 1 ? "record" : "records"}</span>
                    </div>
                  </div>
                </div>
              </Link>
              <div className="px-5 pb-4">
                <Link
                  href={form.newHref}
                  className="inline-flex items-center gap-1.5 text-xs text-[#7BC143] hover:text-[#6aad38] font-medium"
                >
                  <Plus size={12} /> Create New
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
