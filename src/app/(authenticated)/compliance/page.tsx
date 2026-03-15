"use client";

import { useState } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import { COMPLIANCE_CHECKLISTS } from "@/lib/regulations";
import type { ChecklistSection } from "@/lib/regulations";
import { FileDown } from "lucide-react";

type ServiceType = "ASBESTOS" | "LEAD" | "METH" | "MOLD";

const SERVICE_PDF: Record<ServiceType, { href: string; label: string }> = {
  ASBESTOS: { href: "/regulations/asbestos-regulations.pdf", label: "Asbestos Regulations" },
  LEAD: { href: "/regulations/lead-regulations.pdf", label: "Lead Regulations" },
  METH: { href: "/regulations/meth-regulations.pdf", label: "Meth Lab Regulations" },
  MOLD: { href: "/regulations/mold-regulations.pdf", label: "Mold Regulations" },
};

type RowData = [string, string];

const REGULATION_DATA: Record<ServiceType, { title: string; rows: RowData[] }[]> = {
  ASBESTOS: [
    {
      title: "Abatement Contractor & Crew Requirements",
      rows: [
        ["GAC Renewal Fee", "$1,000 (required to operate as abatement contractor)"],
        ["Supervisor Training", "40 hours initial + 8 hours refresher annually"],
        ["Worker Training", "32 hours initial + 8 hours refresher annually"],
        ["Competent Person", "Required on-site for Class I/II work; EPA MAP supervisor training"],
        ["Training Refresher (EPA)", "Every 2 years"],
        ["Medical Surveillance", "Initial + annual + termination exams for all crew"],
        ["Respirator", "HEPA filters required; no filtering facepieces for abatement"],
      ],
    },
    {
      title: "Project Notification & Permits",
      rows: [
        ["CDPHE Notification", "10 working days advance to CDPHE before work begins"],
        ["Residential Trigger", "≥32 sq ft or ≥50 linear ft of ACM"],
        ["Commercial Trigger", "≥160 sq ft or ≥260 linear ft of ACM"],
        ["EPA/NESHAP Notification", "10 working days before demolition/renovation"],
        ["Permit Fee (30-day)", "$400"],
        ["Permit Fee (90-day)", "$800"],
        ["Penalty", "Up to $25,000/day/violation"],
        ["Submission Email", "cdphe.asbestos@state.co.us"],
      ],
    },
    {
      title: "Removal & Containment Standards",
      rows: [
        ["Work Classes", "I (TSI/Surfacing), II (Non-TSI), III (Repair), IV (Custodial)"],
        ["PEL (8hr TWA)", "0.1 f/cc"],
        ["Excursion Limit (30min)", "1.0 f/cc"],
        ["Wet Methods", "Required during all removal activities"],
        ["Containment", "Negative pressure enclosure for Class I work"],
        ["Waste Handling", "Leak-tight containers, wet, labeled per NESHAP"],
        ["Disposal", "Qualified asbestos landfill only"],
      ],
    },
    {
      title: "Clearance & Records",
      rows: [
        ["Air Clearance (PCM)", "<0.01 f/cc (min 1,199L sample)"],
        ["Air Clearance (TEM)", "70 structures/mm²"],
        ["Medical Record Retention", "Duration of employment + 30 years"],
        ["Exposure Record Retention", "30 years"],
        ["Training Record Retention", "1 year beyond last employment"],
      ],
    },
  ],
  LEAD: [
    {
      title: "Abatement Contractor & Crew Requirements",
      rows: [
        ["Worker Training", "16 hours initial (CDPHE + EPA)"],
        ["Supervisor Training", "32 hours initial (CDPHE + EPA)"],
        ["State Exam", "Required in addition to EPA training"],
        ["Cert Duration", "1, 2, or 3 years (applicant choice)"],
        ["Worker/Supervisor Cert Fee", "$230 (1yr), $410 (2yr), $590 (3yr)"],
        ["Certified Renovator", "Must be designated to each RRP job"],
        ["Firm Certification (EPA)", "Valid 5 years"],
        ["BLL Baseline", "Required for all workers before lead exposure"],
        ["BLL Monitoring", "Every 2 months × 6, then every 6 months"],
        ["Medical Removal", "BLL > 50 µg/dL → remove worker from exposure"],
        ["Return to Work", "BLL ≤ 40 µg/dL"],
      ],
    },
    {
      title: "Project Notification & Triggers",
      rows: [
        ["Pre-Renovation Notice", "7 days before work to occupants"],
        ["Required Pamphlet", "'Renovate Right' to owners/occupants before work"],
        ["Applicability", "Pre-1978 housing, child care, kindergartens"],
        ["Interior Trigger (RRP)", "≥6 sq ft disturbed"],
        ["Exterior Trigger (RRP)", "≥20 sq ft disturbed"],
        ["PEL (8hr TWA)", "50 µg/m³"],
        ["Action Level", "30 µg/m³"],
      ],
    },
    {
      title: "Removal Practices & Containment",
      rows: [
        ["Work Practices", "HEPA vacuum + wet methods required"],
        ["Containment", "Per RRP rule — plastic sheeting, sealed work area"],
        ["Prohibited Methods", "No open flame burning, power sanding without HEPA, heat gun >1100°F"],
        ["Waste Handling", "Contained, labeled, disposed per CO/EPA requirements"],
      ],
    },
    {
      title: "Clearance & Records",
      rows: [
        ["Clearance - Floors", "≤5 µg/ft²"],
        ["Clearance - Windowsills", "≤40 µg/ft²"],
        ["Clearance - Window Troughs", "≤100 µg/ft²"],
        ["Clearance Report Note", "Must state hazards may remain even below DLAL"],
        ["RRP Record Retention", "3 years after project completion"],
        ["Medical/Exposure Records", "Duration + 30 years (OSHA)"],
      ],
    },
  ],
  METH: [
    {
      title: "Decontamination Contractor & Crew Requirements",
      rows: [
        ["Decon Worker Cert", "State certification + 40hr HAZWOPER + Dept training"],
        ["Decon Supervisor Cert", "State certification + Dept supervisor training"],
        ["Annual HAZWOPER Refresher", "8 hours"],
        ["Supervisor On-Site", "Required — must oversee all decontamination work"],
        ["Medical Surveillance", "Baseline + periodic + post-assignment exams"],
        ["PPE Levels", "A, B, C, or D based on site hazard assessment"],
        ["Site Safety Plan", "Required for each remediation site"],
      ],
    },
    {
      title: "Decontamination Work Standards",
      rows: [
        ["HVAC Shutdown", "Required before decontamination begins"],
        ["HEPA Filtration", "99.97% efficiency at 0.3 microns"],
        ["Negative Air", "Containment with negative pressure required"],
        ["Porous Materials", "Remove if unable to be decontaminated"],
        ["Ventilation System", "Must be decontaminated per Appendix C"],
        ["Sampling Method", "Isopropanol wet wipe on 100 cm² area"],
      ],
    },
    {
      title: "Clearance & Reporting",
      rows: [
        ["Clearance - Habitable Areas", "≤0.5 µg/100 cm²"],
        ["Clearance - Limited Exposure", "≤4.0 µg/100 cm² (attics, crawlspaces)"],
        ["Clearance - Painted Surfaces", "≤1.5 µg/100 cm²"],
        ["Screening Level", "0.2 µg/cm² (no further action if below)"],
        ["Consultant Requirement", "CIH, independent from contractor"],
        ["Report Deadline", "30 days to governing body after lab results"],
        ["CDPHE Registry", "Properties listed on meth-affected listing"],
        ["Submission Email", "cdphe_methlabdocuments@state.co.us"],
      ],
    },
  ],
  MOLD: [
    {
      title: "Remediation Contractor & Crew Requirements",
      rows: [
        ["State Licensing", "No specific mold remediation license in Colorado"],
        ["Industry Standard", "Follow IICRC S520 + EPA guidelines"],
        ["Small Jobs (<10 sq ft)", "N95 respirator minimum"],
        ["Medium Jobs (10–100 sq ft)", "Half-face P100 respirator, trained personnel"],
        ["Large Jobs (>100 sq ft)", "Full containment + HAZMAT-level procedures"],
        ["Medical Evaluation", "Recommended for workers with recurring mold exposure"],
        ["Indoor Humidity Target", "Maintain below 60% during and after work"],
      ],
    },
    {
      title: "Remediation Levels (EPA Guidelines)",
      rows: [
        ["Level 1 (<10 sq ft)", "Regular trained staff, N95, no containment"],
        ["Level 2 (10–30 sq ft)", "Trained personnel, limited containment"],
        ["Level 3 (30–100 sq ft)", "Professional remediation, full containment"],
        ["Level 4 (>100 sq ft)", "HAZMAT procedures, full containment, HEPA neg. air"],
        ["HVAC Contamination", "Specialized contractor required, isolate system"],
        ["Porous Materials", "Remove and discard if active growth present"],
        ["Non-Porous Surfaces", "HEPA vacuum + damp wipe cleaning"],
      ],
    },
    {
      title: "Clearance & Conditions (IICRC S520)",
      rows: [
        ["Condition 1", "Normal fungal ecology — no remediation needed"],
        ["Condition 2", "Settled spores, no active growth — cleanup required"],
        ["Condition 3", "Active growth present — full remediation required"],
        ["Clearance Goal", "Restore to Condition 1 or 2"],
        ["Post-Remediation Verification", "Visual inspection + air/surface sampling"],
        ["Moisture Source", "Must be identified and corrected before clearance"],
        ["Real Estate Disclosure", "Required if known mold issues (CO law)"],
      ],
    },
  ],
};

const TABS: { key: ServiceType; label: string; color: string }[] = [
  { key: "ASBESTOS", label: "Asbestos", color: "bg-[#7BC143]" },
  { key: "LEAD", label: "Lead", color: "bg-amber-500" },
  { key: "METH", label: "Meth Lab", color: "bg-red-500" },
  { key: "MOLD", label: "Mold", color: "bg-teal-600" },
];

export default function CompliancePage() {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState<ServiceType>("ASBESTOS");
  const [view, setView] = useState<"regulations" | "checklists">("regulations");

  const checklist = COMPLIANCE_CHECKLISTS[activeType] || [];
  const regSections = REGULATION_DATA[activeType] || [];
  const pdf = SERVICE_PDF[activeType];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{t("compliance.title")}</h1>
        <p className="text-sm text-slate-500">{t("compliance.subtitle")}</p>
      </div>

      {/* Service type tabs */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium transition whitespace-nowrap shrink-0 ${
                activeType === t.key ? `${t.color} text-white` : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* View toggle + PDF download */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-full p-0.5">
            <button
              onClick={() => setView("regulations")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                view === "regulations" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("compliance.quickReference")}
            </button>
            <button
              onClick={() => setView("checklists")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                view === "checklists" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("compliance.checklists")}
            </button>
          </div>
          <a
            href={pdf.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 transition shrink-0"
          >
            <FileDown size={13} />
            <span className="hidden sm:inline">{pdf.label}</span>
            <span className="sm:hidden">PDF</span>
          </a>
        </div>
      </div>

      {/* Regulation Reference Tables */}
      {view === "regulations" && (
        <div className="space-y-4">
          {regSections.map((section) => (
            <div key={section.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold">{section.title}</h3>
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {section.rows.map(([key, value], i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 font-medium text-slate-700 w-[40%]">{key}</td>
                        <td className="px-4 py-2.5 text-slate-600">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile stacked layout */}
              <div className="sm:hidden divide-y divide-slate-100">
                {section.rows.map(([key, value], i) => (
                  <div key={i} className="px-4 py-2.5">
                    <div className="text-xs font-semibold text-slate-700">{key}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compliance Checklists */}
      {view === "checklists" && (
        <div className="space-y-4">
          {checklist.map((section: ChecklistSection) => (
            <div key={section.section} className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{section.section}</h3>
                <span className="text-xs text-slate-400">{section.items.length} requirements</span>
              </div>
              <div className="p-4 space-y-1">
                {section.items.map((item) => (
                  <div key={item.key} className="flex items-start gap-3 py-1.5 px-2">
                    <div className="w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-[13px] flex items-center gap-2">
                        {item.req}
                        {item.critical && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-semibold">{t("compliance.required")}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.reg}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {checklist.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <p className="text-sm text-slate-500">{t("compliance.noChecklists")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
