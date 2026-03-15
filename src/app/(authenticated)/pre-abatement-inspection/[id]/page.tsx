import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckSquare, FileDown } from "lucide-react";
import { PRE_ABATEMENT_ITEMS, REMOVAL_TECHNIQUES } from "@/lib/pre-abatement-checklist";

export const dynamic = "force-dynamic";

function CheckBadge({ value }: { value: "yes" | "no" | "na" }) {
  if (value === "yes") return <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800">Yes</span>;
  if (value === "no") return <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-800">No</span>;
  return <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-800">N/A</span>;
}

export default async function PreAbatementDetailPage({ params }: { params: { id: string } }) {
  const item = await prisma.preAbatementInspection.findUnique({ where: { id: params.id }, include: { project: true } });
  if (!item) notFound();

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    reviewed: "bg-green-100 text-green-800",
  };

  function getPassFailCounts(checklistItems: Record<string, any>) {
    const yes = Object.values(checklistItems).filter((v: any) => v === "yes").length;
    const no = Object.values(checklistItems).filter((v: any) => v === "no").length;
    const na = Object.values(checklistItems).filter((v: any) => v === "na").length;
    const total = Object.values(checklistItems).length;
    return { yes, no, na, total };
  }

  const { yes, no, na, total } = getPassFailCounts(item.checklistItems || {});
  const passed = no === 0;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-4 mb-4">
        <Link href={`/projects/${item.projectId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={14} /> Back to Project
        </Link>
        <Link href="/pre-abatement-inspection" className="text-sm text-slate-400 hover:text-indigo-600">All Inspections</Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare size={20} className="text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900">Pre-Abatement Inspection</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[item.status] || "bg-slate-100"}`}>
              {item.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">{item.project?.name} · {new Date(item.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
        <a
          href={`/api/pre-abatement-inspection/${item.id}/pdf`}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition text-sm"
        >
          <FileDown size={16} /> Download PDF
        </a>
      </div>

      <div className="space-y-5">
        {/* Overview */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Results Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${passed ? "text-green-700" : "text-red-700"}`}>{yes}</div>
              <div className="text-xs text-slate-600">Passed</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${no > 0 ? "text-red-700" : "text-slate-400"}`}>{no}</div>
              <div className="text-xs text-slate-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-500">{na}</div>
              <div className="text-xs text-slate-600">Not Applicable</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{total}</div>
              <div className="text-xs text-slate-600">Total Items</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            <span className={`w-4 h-4 rounded flex items-center justify-center text-xs font-bold ${passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {passed ? "✓" : "✗"}
            </span>
            <span className={`font-semibold ${passed ? "text-green-700" : "text-red-600"}`}>
              {passed ? "All items passed" : "Some items failed or have issues"}
            </span>
          </div>
        </div>

        {/* Inspection Information */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Inspection Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 block">Date</span>
              <div className="font-medium text-slate-900">{new Date(item.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
            </div>
            <div>
              <span className="text-slate-500 block">Inspector</span>
              <div className="font-medium text-slate-900">{item.inspector || "—"}</div>
            </div>
            <div>
              <span className="text-slate-500 block">Contractor Supervisor</span>
              <div className="font-medium text-slate-900">{item.contractorSupervisor || "—"}</div>
            </div>
            <div>
              <span className="text-slate-500 block">Project Manager</span>
              <div className="font-medium text-slate-900">{item.projectManager || "—"}</div>
            </div>
          </div>
        </div>

        {/* Removal Techniques */}
        {item.removalTechnique && item.removalTechnique.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Removal Techniques</h2>
            <div className="flex flex-wrap gap-2">
              {REMOVAL_TECHNIQUES.filter((t) => item.removalTechnique.includes(t.key)).map((t) => (
                <span key={t.key} className="text-sm bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full">
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Checklist Items */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Inspection Checklist</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {PRE_ABATEMENT_ITEMS.map((itemDef) => {
              const value = item.checklistItems?.[itemDef.key] || "na";
              return (
                <div key={itemDef.key} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                  <span className="text-sm text-slate-800 flex-1">{itemDef.label}</span>
                  <CheckBadge value={value} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Comments */}
        {item.comments && (
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Comments</h2>
            <p className="text-sm text-slate-700 whitespace-pre-line">{item.comments}</p>
          </div>
        )}
      </div>
    </div>
  );
}
