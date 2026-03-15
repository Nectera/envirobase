"use client";

import { FileText } from "lucide-react";

const templates = [
  { name: "CDPHE Asbestos Notification", type: "ASBESTOS", desc: "10-day advance notification form for CDPHE", fields: ["Property address", "Owner info", "GAC contractor info", "ACM type & quantity", "Start/end dates", "AMS info", "Disposal site"] },
  { name: "CDPHE Demolition Notification", type: "ASBESTOS", desc: "Pre-demolition notification with ACM survey", fields: ["Property address", "ACM survey results", "Removal methods", "Disposal plan", "Scheduled dates"] },
  { name: "Air Monitoring Report", type: "ASBESTOS", desc: "PCM/TEM clearance testing report", fields: ["Project info", "AMS info", "Sample locations", "Air volumes", "Fiber counts", "Pass/fail"] },
  { name: "Waste Manifest", type: "ASBESTOS", desc: "Asbestos waste tracking from removal to disposal", fields: ["Generator info", "Waste quantity", "Transport company", "Disposal facility", "Manifest number"] },
  { name: "Pre-Renovation Notification", type: "LEAD", desc: "7-day occupant notice with Renovate Right pamphlet", fields: ["Property address", "Occupant names", "Renovation scope", "Start date", "Certified Renovator info"] },
  { name: "Lead Inspection Report", type: "LEAD", desc: "XRF/paint chip testing results", fields: ["Property address", "Inspector info", "Sample locations", "Test results", "Recommendations"] },
  { name: "Dust Clearance Report", type: "LEAD", desc: "Post-abatement dust wipe sampling results", fields: ["Project info", "Sample locations", "Floor results (µg/ft²)", "Sill results", "Trough results", "Pass/fail"] },
  { name: "CIH Preliminary Assessment", type: "METH", desc: "Initial meth contamination assessment", fields: ["Property address", "CIH info", "Law enforcement report #", "Sampling plan", "Wipe results", "Recommendations"] },
  { name: "Decontamination Work Plan", type: "METH", desc: "Scope and procedures for meth decontamination", fields: ["Property info", "Contamination extent", "Decon methods", "HVAC procedures", "PPE requirements", "Schedule"] },
  { name: "Meth Clearance Report", type: "METH", desc: "Post-decontamination sampling and clearance", fields: ["Property info", "CIH info", "Sample locations", "Results (µg/100cm²)", "Pass/fail", "Governing body submission"] },
  { name: "OSHA Exposure Monitoring", type: "ALL", desc: "Personal air monitoring results for workers", fields: ["Worker info", "Hazard type", "Sample date/duration", "Results", "PEL comparison", "Controls"] },
  { name: "Medical Surveillance Record", type: "ALL", desc: "Worker medical exam and BLL tracking", fields: ["Worker info", "Exam date", "Physician", "Findings", "Restrictions", "BLL (if lead)", "Next exam due"] },
];

const typeColor = (t: string) =>
  t === "ASBESTOS" ? "bg-indigo-100 text-indigo-700" :
  t === "LEAD" ? "bg-amber-100 text-amber-700" :
  t === "METH" ? "bg-red-100 text-red-700" :
  t === "MOLD" ? "bg-teal-100 text-teal-700" :
  t === "SELECT_DEMO" ? "bg-orange-100 text-orange-700" :
  t === "REBUILD" ? "bg-violet-100 text-violet-700" :
  "bg-slate-100 text-slate-600";

export default function DocumentsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Document Generator</h1>
        <p className="text-sm text-slate-500">Generate compliance forms and reports from project data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((t, i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold">{t.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex-shrink-0 ${typeColor(t.type)}`}>
                {t.type === "ALL" ? "Universal" : t.type === "ASBESTOS" ? "Asbestos" : t.type === "LEAD" ? "Lead" : t.type === "METH" ? "Meth Lab" : t.type === "MOLD" ? "Mold" : t.type === "SELECT_DEMO" ? "Select Demo" : t.type === "REBUILD" ? "Rebuild" : t.type}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Fields: {t.fields.join(" • ")}
            </p>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition">
              <FileText size={12} /> Generate
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
