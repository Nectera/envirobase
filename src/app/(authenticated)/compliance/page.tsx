"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import { COMPLIANCE_CHECKLISTS } from "@/lib/regulations";
import type { ChecklistSection } from "@/lib/regulations";
import { ExternalLink, Loader2, MapPin, RefreshCw } from "lucide-react";

type ServiceType = "ASBESTOS" | "LEAD" | "METH" | "MOLD";
type SourceLink = { label: string; url: string; type: "state" | "federal" };

// Colorado hardcoded source links for instant loading
const CO_SOURCES: Record<ServiceType, SourceLink[]> = {
  ASBESTOS: [
    { label: "CDPHE Regulation 8, Part B", url: "https://cdphe.colorado.gov/asbestos", type: "state" },
    { label: "OSHA 29 CFR 1926.1101", url: "https://www.osha.gov/laws/regs/regulations/standardnumber/1926/1926.1101", type: "federal" },
    { label: "EPA NESHAP (40 CFR 61 Subpart M)", url: "https://www.epa.gov/asbestos/asbestos-neshap-regulations-and-guidance", type: "federal" },
  ],
  LEAD: [
    { label: "CDPHE Regulation 19", url: "https://cdphe.colorado.gov/lead", type: "state" },
    { label: "OSHA 29 CFR 1926.62", url: "https://www.osha.gov/laws/regs/regulations/standardnumber/1926/1926.62", type: "federal" },
    { label: "EPA RRP Rule (40 CFR 745)", url: "https://www.epa.gov/lead/lead-renovation-repair-and-painting-program", type: "federal" },
  ],
  METH: [
    { label: "Colorado 6 CCR 1014-3", url: "https://cdphe.colorado.gov/meth-labs", type: "state" },
    { label: "CRS 25-18.5", url: "https://leg.colorado.gov/colorado-revised-statutes", type: "state" },
    { label: "OSHA HAZWOPER (29 CFR 1910.120)", url: "https://www.osha.gov/laws/regs/regulations/standardnumber/1910/1910.120", type: "federal" },
  ],
  MOLD: [
    { label: "EPA Mold Remediation Guidelines", url: "https://www.epa.gov/mold/mold-remediation-schools-and-commercial-buildings-guide", type: "federal" },
    { label: "OSHA Mold Safety (OSHA 3160)", url: "https://www.osha.gov/mold", type: "federal" },
    { label: "IICRC S520 Standard", url: "https://iicrc.org/standards/iicrc-s520/", type: "federal" },
  ],
};

const TABS: { key: ServiceType; label: string; color: string }[] = [
  { key: "ASBESTOS", label: "Asbestos", color: "bg-[#7BC143]" },
  { key: "LEAD", label: "Lead", color: "bg-amber-500" },
  { key: "METH", label: "Meth Lab", color: "bg-red-500" },
  { key: "MOLD", label: "Mold", color: "bg-teal-600" },
];

// Colorado fallback data (hardcoded) — used as instant fallback for CO orgs
const CO_REGULATION_DATA: Record<ServiceType, { title: string; rows: [string, string][] }[]> = {
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
        ["Residential Trigger", "\u226532 sq ft or \u226550 linear ft of ACM"],
        ["Commercial Trigger", "\u2265160 sq ft or \u2265260 linear ft of ACM"],
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
        ["Air Clearance (TEM)", "70 structures/mm\u00B2"],
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
        ["BLL Monitoring", "Every 2 months \u00D7 6, then every 6 months"],
        ["Medical Removal", "BLL > 50 \u00B5g/dL \u2192 remove worker from exposure"],
        ["Return to Work", "BLL \u2264 40 \u00B5g/dL"],
      ],
    },
    {
      title: "Project Notification & Triggers",
      rows: [
        ["Pre-Renovation Notice", "7 days before work to occupants"],
        ["Required Pamphlet", "'Renovate Right' to owners/occupants before work"],
        ["Applicability", "Pre-1978 housing, child care, kindergartens"],
        ["Interior Trigger (RRP)", "\u22656 sq ft disturbed"],
        ["Exterior Trigger (RRP)", "\u226520 sq ft disturbed"],
        ["PEL (8hr TWA)", "50 \u00B5g/m\u00B3"],
        ["Action Level", "30 \u00B5g/m\u00B3"],
      ],
    },
    {
      title: "Removal Practices & Containment",
      rows: [
        ["Work Practices", "HEPA vacuum + wet methods required"],
        ["Containment", "Per RRP rule \u2014 plastic sheeting, sealed work area"],
        ["Prohibited Methods", "No open flame burning, power sanding without HEPA, heat gun >1100\u00B0F"],
        ["Waste Handling", "Contained, labeled, disposed per CO/EPA requirements"],
      ],
    },
    {
      title: "Clearance & Records",
      rows: [
        ["Clearance - Floors", "\u22645 \u00B5g/ft\u00B2"],
        ["Clearance - Windowsills", "\u226440 \u00B5g/ft\u00B2"],
        ["Clearance - Window Troughs", "\u2264100 \u00B5g/ft\u00B2"],
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
        ["Supervisor On-Site", "Required \u2014 must oversee all decontamination work"],
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
        ["Sampling Method", "Isopropanol wet wipe on 100 cm\u00B2 area"],
      ],
    },
    {
      title: "Clearance & Reporting",
      rows: [
        ["Clearance - Habitable Areas", "\u22640.5 \u00B5g/100 cm\u00B2"],
        ["Clearance - Limited Exposure", "\u22644.0 \u00B5g/100 cm\u00B2 (attics, crawlspaces)"],
        ["Clearance - Painted Surfaces", "\u22641.5 \u00B5g/100 cm\u00B2"],
        ["Screening Level", "0.2 \u00B5g/cm\u00B2 (no further action if below)"],
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
        ["Medium Jobs (10\u2013100 sq ft)", "Half-face P100 respirator, trained personnel"],
        ["Large Jobs (>100 sq ft)", "Full containment + HAZMAT-level procedures"],
        ["Medical Evaluation", "Recommended for workers with recurring mold exposure"],
        ["Indoor Humidity Target", "Maintain below 60% during and after work"],
      ],
    },
    {
      title: "Remediation Levels (EPA Guidelines)",
      rows: [
        ["Level 1 (<10 sq ft)", "Regular trained staff, N95, no containment"],
        ["Level 2 (10\u201330 sq ft)", "Trained personnel, limited containment"],
        ["Level 3 (30\u2013100 sq ft)", "Professional remediation, full containment"],
        ["Level 4 (>100 sq ft)", "HAZMAT procedures, full containment, HEPA neg. air"],
        ["HVAC Contamination", "Specialized contractor required, isolate system"],
        ["Porous Materials", "Remove and discard if active growth present"],
        ["Non-Porous Surfaces", "HEPA vacuum + damp wipe cleaning"],
      ],
    },
    {
      title: "Clearance & Conditions (IICRC S520)",
      rows: [
        ["Condition 1", "Normal fungal ecology \u2014 no remediation needed"],
        ["Condition 2", "Settled spores, no active growth \u2014 cleanup required"],
        ["Condition 3", "Active growth present \u2014 full remediation required"],
        ["Clearance Goal", "Restore to Condition 1 or 2"],
        ["Post-Remediation Verification", "Visual inspection + air/surface sampling"],
        ["Moisture Source", "Must be identified and corrected before clearance"],
        ["Real Estate Disclosure", "Required if known mold issues (CO law)"],
      ],
    },
  ],
};

type RegSection = { title: string; rows: [string, string][] };
type ChecklistData = { section: string; items: { key: string; req: string; reg: string; critical: boolean }[] };

export default function CompliancePage() {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState<ServiceType>("ASBESTOS");
  const [view, setView] = useState<"regulations" | "checklists">("regulations");

  // Org state
  const [orgState, setOrgState] = useState<string | null>(null);
  const [stateName, setStateName] = useState<string>("Colorado");
  const [loadingState, setLoadingState] = useState(true);

  // Dynamic regulation data per type
  const [dynamicRegs, setDynamicRegs] = useState<Record<string, RegSection[]>>({});
  const [dynamicChecklists, setDynamicChecklists] = useState<Record<string, ChecklistData[]>>({});
  const [dynamicSources, setDynamicSources] = useState<Record<string, SourceLink[]>>({});
  const [loadingRegs, setLoadingRegs] = useState<Record<string, boolean>>({});
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  // Fetch org state on mount
  useEffect(() => {
    fetch("/api/settings/branding")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.state) {
          setOrgState(data.state);
        } else {
          setOrgState("CO"); // Default to Colorado
        }
      })
      .catch(() => setOrgState("CO"))
      .finally(() => setLoadingState(false));
  }, []);

  // Fetch regulations for active type when state is known
  const fetchRegs = useCallback(async (state: string, type: ServiceType) => {
    const cacheKey = `${state}-${type}`;
    if (dynamicRegs[cacheKey] || loadingRegs[cacheKey]) return;

    // For Colorado, use hardcoded data immediately
    if (state === "CO") {
      setDynamicRegs((prev) => ({ ...prev, [cacheKey]: CO_REGULATION_DATA[type] }));
      const coChecklist = COMPLIANCE_CHECKLISTS[type] || [];
      setDynamicChecklists((prev) => ({ ...prev, [cacheKey]: coChecklist }));
      setDynamicSources((prev) => ({ ...prev, [cacheKey]: CO_SOURCES[type] || [] }));
      return;
    }

    setLoadingRegs((prev) => ({ ...prev, [cacheKey]: true }));
    setRegErrors((prev) => ({ ...prev, [cacheKey]: "" }));

    try {
      const res = await fetch(`/api/compliance/regulations?state=${state}&type=${type}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setStateName(data.stateName || state);
      setDynamicRegs((prev) => ({ ...prev, [cacheKey]: data.data || [] }));
      setDynamicChecklists((prev) => ({ ...prev, [cacheKey]: data.checklists || [] }));
      setDynamicSources((prev) => ({ ...prev, [cacheKey]: data.sources || [] }));
    } catch {
      setRegErrors((prev) => ({ ...prev, [cacheKey]: "Failed to load regulations. Using federal defaults." }));
      // Fall back to Colorado data as a reasonable default
      setDynamicRegs((prev) => ({ ...prev, [cacheKey]: CO_REGULATION_DATA[type] }));
      setDynamicChecklists((prev) => ({ ...prev, [cacheKey]: COMPLIANCE_CHECKLISTS[type] || [] }));
    } finally {
      setLoadingRegs((prev) => ({ ...prev, [cacheKey]: false }));
    }
  }, [dynamicRegs, loadingRegs]);

  useEffect(() => {
    if (orgState) {
      fetchRegs(orgState, activeType);
      if (orgState === "CO") setStateName("Colorado");
    }
  }, [orgState, activeType, fetchRegs]);

  const cacheKey = orgState ? `${orgState}-${activeType}` : "";
  const regSections = dynamicRegs[cacheKey] || [];
  const checklist: ChecklistData[] = dynamicChecklists[cacheKey] || [];
  const isLoadingRegs = loadingRegs[cacheKey] || false;
  const regError = regErrors[cacheKey] || "";
  const sources: SourceLink[] = dynamicSources[cacheKey] || [];

  const handleRefresh = () => {
    if (!orgState) return;
    const key = `${orgState}-${activeType}`;
    setDynamicRegs((prev) => { const next = { ...prev }; delete next[key]; return next; });
    setDynamicChecklists((prev) => { const next = { ...prev }; delete next[key]; return next; });
    setDynamicSources((prev) => { const next = { ...prev }; delete next[key]; return next; });
    // Re-trigger fetch
    setTimeout(() => fetchRegs(orgState, activeType), 0);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{t("compliance.title")}</h1>
        <p className="text-sm text-slate-500">
          {loadingState ? (
            "Loading..."
          ) : (
            <>
              <MapPin size={12} className="inline mr-1" />
              {stateName}, OSHA, and EPA standards, checklists, and reference documents
            </>
          )}
        </p>
      </div>

      {/* Service type tabs */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveType(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium transition whitespace-nowrap shrink-0 ${
                activeType === tab.key ? `${tab.color} text-white` : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* View toggle + PDF download + refresh */}
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
          <div className="flex items-center gap-2">
            {orgState && orgState !== "CO" && (
              <button
                onClick={handleRefresh}
                disabled={isLoadingRegs}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition shrink-0 disabled:opacity-50"
                title="Regenerate regulations"
              >
                <RefreshCw size={12} className={isLoadingRegs ? "animate-spin" : ""} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoadingRegs && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center mb-4">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Generating {stateName} regulations for {TABS.find((t) => t.key === activeType)?.label}...</p>
          <p className="text-xs text-slate-400 mt-1">This may take a few seconds on first load. Results are cached for future visits.</p>
        </div>
      )}

      {/* Error banner */}
      {regError && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          {regError}
        </div>
      )}

      {/* Regulation Reference Tables */}
      {view === "regulations" && !isLoadingRegs && (
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
          {regSections.length === 0 && !isLoadingRegs && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <p className="text-sm text-slate-500">No regulation data available.</p>
            </div>
          )}
        </div>
      )}

      {/* Compliance Checklists */}
      {view === "checklists" && !isLoadingRegs && (
        <div className="space-y-4">
          {checklist.map((section: ChecklistData) => (
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

          {checklist.length === 0 && !isLoadingRegs && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <p className="text-sm text-slate-500">{t("compliance.noChecklists")}</p>
            </div>
          )}
        </div>
      )}

      {/* Source Links */}
      {!isLoadingRegs && sources.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Regulation Sources</h3>
            <p className="text-xs text-slate-400 mt-0.5">Official regulation documents and agency pages</p>
          </div>
          <div className="p-4 space-y-2">
            {sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition group"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  src.type === "state" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                }`}>
                  <ExternalLink size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">{src.label}</div>
                  <div className="text-[11px] text-slate-400 truncate">{src.url}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  src.type === "state" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                }`}>
                  {src.type === "state" ? "State" : "Federal"}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
