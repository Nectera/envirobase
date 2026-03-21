import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, FileDown } from "lucide-react";
import {
  ENVIRONMENT_HAZARDS, ERGONOMICS_HAZARDS, HEIGHT_HAZARDS, ACTIVITY_HAZARDS,
  ACCESS_EGRESS_HAZARDS, PERSONAL_LIMITATIONS, PPE_REQUIREMENTS,
} from "@/lib/psi-hazards";

export const dynamic = "force-dynamic";

function HazardList({ title, allItems, checked }: { title: string; allItems: { key: string; label: string }[]; checked: string[] }) {
  const active = allItems.filter((i) => checked.includes(i.key));
  if (active.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-600 mb-1">{title}</h4>
      <div className="flex flex-wrap gap-1">
        {active.map((i) => (
          <span key={i.key} className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
            {i.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function PsiJhaSpaDetailPage({ params }: { params: { id: string } }) {
  const item = await prisma.psiJhaSpa.findUnique({ where: { id: params.id }, include: { project: true } });
  if (!item) notFound();

  function getRiskColor(r: number) {
    if (r >= 8) return "bg-red-600 text-white";
    if (r >= 6) return "bg-orange-500 text-white";
    if (r === 5) return "bg-yellow-400 text-black";
    return "bg-green-500 text-white";
  }

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    reviewed: "bg-green-100 text-green-800",
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-4 mb-4">
        <Link href={`/projects/${item.projectId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={14} /> Back to Project
        </Link>
        <Link href="/psi-jha-spa" className="text-sm text-slate-400 hover:text-indigo-600">All Forms</Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900">PSI / JHA / SPA</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[item.status] || "bg-slate-100"}`}>
              {item.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">{item.project?.name} · {new Date(item.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at {item.time}</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Job Info */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Job Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-500">Job No.</span><div className="font-medium">{item.jobNumber || "—"}</div></div>
            <div><span className="text-slate-500">Task Location</span><div className="font-medium">{item.taskLocation || "—"}</div></div>
            <div><span className="text-slate-500">Muster Point</span><div className="font-medium">{item.musterPoint || "—"}</div></div>
            <div className="col-span-3"><span className="text-slate-500">Job Site Address</span><div className="font-medium">{item.jobSiteAddress || "—"}</div></div>
            <div><span className="text-slate-500">Nearest Emergency Room</span><div className="font-medium">{item.nearestHospital || "—"}</div></div>
            <div className="col-span-2"><span className="text-slate-500">Emergency Room Address</span><div className="font-medium">{item.nearestHospitalAddress || "—"}</div></div>
          </div>
        </div>

        {/* Hazards */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Identified Hazards & PPE</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <HazardList title="Environment" allItems={ENVIRONMENT_HAZARDS} checked={item.environmentHazards || []} />
              <HazardList title="Ergonomics" allItems={ERGONOMICS_HAZARDS} checked={item.ergonomicsHazards || []} />
              <HazardList title="Height" allItems={HEIGHT_HAZARDS} checked={item.heightHazards || []} />
            </div>
            <div className="space-y-3">
              <HazardList title="Activity" allItems={ACTIVITY_HAZARDS} checked={item.activityHazards || []} />
              <HazardList title="Access/Egress" allItems={ACCESS_EGRESS_HAZARDS} checked={item.accessEgressHazards || []} />
            </div>
            <div className="space-y-3">
              <HazardList title="Personal Limitations" allItems={PERSONAL_LIMITATIONS} checked={item.personalLimitationsHazards || []} />
              <HazardList title="PPE Required" allItems={PPE_REQUIREMENTS} checked={item.ppeRequirements || []} />
            </div>
          </div>
          {item.otherHazards && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600">Other:</span>
              <p className="text-sm text-slate-700 mt-1">{item.otherHazards}</p>
            </div>
          )}
        </div>

        {/* Task Steps */}
        {item.taskSteps?.length > 0 && (
          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Task Steps & Hazard Controls</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Task Step</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Hazard</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Control</th>
                  <th className="text-center px-4 py-2 font-medium text-slate-600 text-xs w-20">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {item.taskSteps.map((step: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-slate-800 align-top">{step.step}</td>
                    <td className="px-4 py-3 text-slate-600 align-top whitespace-pre-line">{step.hazard}</td>
                    <td className="px-4 py-3 text-slate-600 align-top whitespace-pre-line">{step.control}</td>
                    <td className="px-4 py-3 text-center align-top">
                      <span className={`inline-block w-8 h-8 leading-8 rounded text-sm font-bold ${getRiskColor(step.riskRating)}`}>
                        {step.riskRating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Weather */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Weather</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-2">Current</h4>
              <div className="space-y-1 text-slate-700">
                <div>Temp: <strong>{item.weatherCurrentTemp || "—"}</strong></div>
                <div>Wind: <strong>{item.weatherCurrentWind || "—"}</strong></div>
                <div>Conditions: <strong>{item.weatherCurrentCondition || "—"}</strong></div>
                <div>Humidity: <strong>{item.weatherCurrentHumidity || "—"}</strong></div>
                <div>Heat Index: <strong>{item.weatherCurrentHeatIndex || "—"}</strong></div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-2">Forecast</h4>
              <div className="space-y-1 text-slate-700">
                <div>Temp: <strong>{item.weatherForecastTemp || "—"}</strong></div>
                <div>Wind: <strong>{item.weatherForecastWind || "—"}</strong></div>
                <div>Conditions: <strong>{item.weatherForecastCondition || "—"}</strong></div>
                <div>Humidity: <strong>{item.weatherForecastHumidity || "—"}</strong></div>
                <div>Heat Index: <strong>{item.weatherForecastHeatIndex || "—"}</strong></div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${item.reviewedWeather ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {item.reviewedWeather ? "✓" : "✗"}
              </span>
              Reviewed weather with crew
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${item.reviewedRoadConditions ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {item.reviewedRoadConditions ? "✓" : "✗"}
              </span>
              Reviewed road conditions with crew
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${item.reviewedOshaHeatIndex ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {item.reviewedOshaHeatIndex ? "✓" : "✗"}
              </span>
              Reviewed OSHA Heat Index
            </div>
          </div>
        </div>

        {/* Sign-off & Adequacy */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Review & Sign-off</h2>
          <div className="text-sm space-y-2">
            <div>Supervisor: <strong>{item.supervisorName || "—"}</strong>
              {item.supervisorVerified && <span className="ml-2 text-green-600 text-xs font-medium">VERIFIED on {new Date(item.supervisorTimestamp).toLocaleString()}</span>}
            </div>
            <div className="flex gap-6 mt-2">
              <div>Task Description: <strong className={item.taskDescriptionAdequate ? "text-green-700" : "text-red-600"}>{item.taskDescriptionAdequate ? "Adequate" : "Inadequate"}</strong></div>
              <div>Hazard ID: <strong className={item.hazardIdentificationAdequate ? "text-green-700" : "text-red-600"}>{item.hazardIdentificationAdequate ? "Adequate" : "Inadequate"}</strong></div>
              <div>Reviewed by Lead: <strong className={item.reviewedByLead ? "text-green-700" : "text-red-600"}>{item.reviewedByLead ? "Adequate" : "Inadequate"}</strong></div>
            </div>
          </div>
          {item.comments && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600">Comments:</span>
              <p className="text-sm text-slate-700 mt-1">{item.comments}</p>
            </div>
          )}
          {item.evacuationPlan && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600">Evacuation Plan:</span>
              <p className="text-sm text-slate-700 mt-1">{item.evacuationPlan}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
