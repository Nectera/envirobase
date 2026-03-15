// ─── Static Regulatory Data Engine ─────────────────────────────────────────
// This data is referenced throughout the application for compliance checklists,
// regulatory reference pages, and project validation.

export const REGULATIONS = {
  asbestos: {
    colorado: {
      authority: "CDPHE Air Quality Control Commission Regulation 8, Part B",
      notificationDays: 10,
      triggerLevels: {
        residential: { area: 32, linear: 50, unit: "sq ft / linear ft" },
        commercial: { area: 160, linear: 260, unit: "sq ft / linear ft" },
      },
      airClearance: { pcm: 0.01, unit: "f/cc", minVolume: 1199 },
      permits: [
        { type: "Single Family Residential", fee: 60 },
        { type: "Public & Commercial Notice", fee: 80 },
        { type: "Demolition Notice", fee: 50, perSqFt: 5 },
        { type: "1-Year Public/Commercial Permit", fee: 1200 },
      ],
      certifications: [
        { role: "General Abatement Contractor (GAC)", renewalFee: 1000 },
        { role: "Building Inspector", initialHours: 16, refreshHours: 4, fee: 125 },
        { role: "Management Planner", refreshHours: 4, fee: 150 },
        { role: "Project Designer", initialHours: 24, refreshHours: 8, fee: 150 },
        { role: "Abatement Supervisor", initialHours: 40, refreshHours: 8 },
        { role: "Abatement Worker", initialHours: 32, refreshHours: 8 },
        { role: "Air Monitoring Specialist", fee: 250 },
      ],
      penalties: { perDay: 25000 },
      submissionEmail: "cdphe.asbestos@state.co.us",
    },
    federal: {
      osha: {
        standard: "29 CFR 1926.1101",
        pel: { twa8hr: 0.1, excursion30min: 1.0, unit: "f/cc" },
        medicalRetention: 30,
        exposureRetention: 30,
        trainingRetention: 1,
        classes: [
          "Class I - TSI/Surfacing ACM",
          "Class II - Non-TSI Materials",
          "Class III - Repair/Maintenance",
          "Class IV - Custodial/Cleanup",
        ],
      },
      epa: {
        standard: "40 CFR Part 61, Subpart M (NESHAP)",
        notificationDays: 10,
        thresholds: { linear: 260, area: 160, cubic: 35 },
        wasteRequirements: "Leak-tight container, wet, labeled, qualified landfill",
        trainingRefresher: 2, // years
      },
    },
  },
  lead: {
    colorado: {
      authority: "CDPHE Regulation No. 19",
      preRenovationNotice: 7,
      clearance: { floors: 5, windowsills: 40, troughs: 100, unit: "µg/ft²" },
      certifications: [
        { role: "Abatement Worker", initialHours: 16, fee1yr: 230, fee2yr: 410, fee3yr: 590 },
        { role: "Supervisor", initialHours: 32, fee1yr: 230, fee2yr: 410, fee3yr: 590 },
        { role: "Inspector", initialHours: 24, fee1yr: 175 },
        { role: "Risk Assessor", initialHours: 16, fee1yr: 175 },
        { role: "Project Designer", initialHours: 8, fee1yr: 175 },
      ],
    },
    federal: {
      osha: {
        standard: "29 CFR 1926.62",
        pel: 50,
        actionLevel: 30,
        unit: "µg/m³",
        removalLevel: 50,
        returnLevel: 40,
        bllUnit: "µg/dL",
        medicalRetention: 30,
      },
      epa: {
        standard: "40 CFR Part 745 (RRP Rule)",
        firmCertValidity: 5,
        renovatorCertValidity: 3,
        recordRetention: 3,
        triggers: { interior: 6, exterior: 20, unit: "sq ft" },
      },
    },
  },
  meth: {
    colorado: {
      authority: "6 CCR 1014-3",
      statute: "CRS 25-18.5",
      clearance: {
        habitable: 0.5,
        limitedExposure: 4.0,
        paintedSurface: 1.5,
        screeningLevel: 0.2,
        unit: "µg/100 cm²",
      },
      certifications: [
        { role: "Consultant (CIH)", requires: "CIH + 40hr HAZWOPER + Dept Training" },
        { role: "Decontamination Worker", requires: "State cert + 40hr HAZWOPER + Dept Training" },
        { role: "Decontamination Supervisor", requires: "State cert + Dept Supervisor Training" },
        { role: "Ventilation Contractor", requires: "Experience + State approval" },
      ],
      reportDeadline: 30,
      submissionEmail: "cdphe_methlabdocuments@state.co.us",
    },
    federal: {
      osha: {
        standard: "29 CFR 1910.120 (HAZWOPER)",
        trainingLevels: { siteWorker: 24, siteManager: 40, refresher: 8, unit: "hours" },
      },
      epa: { standard: "Voluntary Guidelines (not mandatory)" },
    },
  },
};

export const TYPE_COLORS: Record<string, string> = {
  ASBESTOS: "#6366f1",
  LEAD: "#f59e0b",
  METH: "#ef4444",
  MOLD: "#0d9488",
  SELECT_DEMO: "#f97316",
  REBUILD: "#8b5cf6",
  SELECT_DEMO_REBUILD: "#f97316",
};

export const TYPE_LABELS: Record<string, string> = {
  ASBESTOS: "Asbestos",
  LEAD: "Lead",
  METH: "Meth Lab",
  MOLD: "Mold",
  SELECT_DEMO: "Select Demo",
  REBUILD: "Rebuild",
  SELECT_DEMO_REBUILD: "Select Demo & Rebuild",
};

export const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  in_progress: "#3b82f6",
  pending: "#9ca3af",
  planning: "#8b5cf6",
  assessment: "#f59e0b",
  on_hold: "#64748b",
  expired: "#ef4444",
  active: "#10b981",
  expiring_soon: "#f59e0b",
};

// ─── Compliance Checklists ────────────────────────────────────────────────────
export type ChecklistItem = {
  key: string;
  req: string;
  reg: string;
  critical: boolean;
};

export type ChecklistSection = {
  section: string;
  items: ChecklistItem[];
};

export const COMPLIANCE_CHECKLISTS: Record<string, ChecklistSection[]> = {
  ASBESTOS: [
    {
      section: "Pre-Project",
      items: [
        { key: "asb-pre-1", req: "CDPHE 10-working-day notification filed", reg: "Reg 8, Part B", critical: true },
        { key: "asb-pre-2", req: "Permit obtained (Public/Commercial or Residential)", reg: "Reg 8, Part B", critical: true },
        { key: "asb-pre-3", req: "Building inspection completed (ACM identified)", reg: "Reg 8 / NESHAP", critical: true },
        { key: "asb-pre-4", req: "GAC contractor certification verified", reg: "Reg 8, Part B", critical: true },
        { key: "asb-pre-5", req: "Competent person designated (Class I/II)", reg: "OSHA 1926.1101", critical: true },
        { key: "asb-pre-6", req: "Worker certifications current (Supervisor + Workers)", reg: "Reg 8 / OSHA", critical: true },
        { key: "asb-pre-7", req: "AMS certified and scheduled", reg: "Reg 8, Part B", critical: true },
        { key: "asb-pre-8", req: "Project Designer engaged (if required)", reg: "Reg 8, Part B", critical: false },
        { key: "asb-pre-9", req: "Initial exposure assessment completed", reg: "OSHA 1926.1101", critical: true },
        { key: "asb-pre-10", req: "Medical surveillance current for all workers", reg: "OSHA 1926.1101", critical: true },
        { key: "asb-pre-11", req: "Respiratory protection program in place", reg: "OSHA 1910.134", critical: true },
      ],
    },
    {
      section: "During Project",
      items: [
        { key: "asb-dur-1", req: "Regulated area established and posted", reg: "OSHA 1926.1101", critical: true },
        { key: "asb-dur-2", req: "Containment/negative pressure verified", reg: "OSHA / Reg 8", critical: true },
        { key: "asb-dur-3", req: "Daily work logs maintained", reg: "Reg 8, Part B", critical: false },
        { key: "asb-dur-4", req: "Exposure monitoring conducted per schedule", reg: "OSHA 1926.1101", critical: true },
        { key: "asb-dur-5", req: "Wet methods used during removal", reg: "NESHAP / OSHA", critical: true },
        { key: "asb-dur-6", req: "Waste sealed in leak-tight containers while wet", reg: "40 CFR 61 Subpart M", critical: true },
        { key: "asb-dur-7", req: "Waste manifests initiated", reg: "6 CCR 1007-2", critical: true },
      ],
    },
    {
      section: "Post-Project",
      items: [
        { key: "asb-post-1", req: "Final visual inspection by AMS", reg: "Reg 8, Part B", critical: true },
        { key: "asb-post-2", req: "Air clearance sampling (<0.01 f/cc PCM, min 1,199L)", reg: "Reg 8 / OSHA", critical: true },
        { key: "asb-post-3", req: "Waste disposed at approved CDPHE facility", reg: "6 CCR 1007-2", critical: true },
        { key: "asb-post-4", req: "Waste manifests completed and filed", reg: "6 CCR 1007-2", critical: true },
        { key: "asb-post-5", req: "Project completion report submitted to CDPHE", reg: "Reg 8, Part B", critical: false },
        { key: "asb-post-6", req: "All records archived (30-year retention)", reg: "OSHA 1926.1101", critical: true },
      ],
    },
  ],
  LEAD: [
    {
      section: "Pre-Project",
      items: [
        { key: "lead-pre-1", req: "Firm certification active (CO CDPHE)", reg: "Reg 19", critical: true },
        { key: "lead-pre-2", req: "Pre-renovation notification to occupants (7 days)", reg: "Reg 19 / RRP", critical: true },
        { key: "lead-pre-3", req: "Written acknowledgment obtained from occupants", reg: "40 CFR 745 / Reg 19", critical: true },
        { key: "lead-pre-4", req: "'Renovate Right' pamphlet provided", reg: "40 CFR 745.84", critical: true },
        { key: "lead-pre-5", req: "Lead inspection / risk assessment completed", reg: "Reg 19", critical: true },
        { key: "lead-pre-6", req: "Certified Renovator designated to job", reg: "40 CFR 745", critical: true },
        { key: "lead-pre-7", req: "Worker certifications current (CO + EPA)", reg: "Reg 19 / RRP", critical: true },
        { key: "lead-pre-8", req: "Blood lead baseline established for workers", reg: "OSHA 1926.62", critical: true },
        { key: "lead-pre-9", req: "Lead abatement permit obtained", reg: "Reg 19", critical: true },
      ],
    },
    {
      section: "During Project",
      items: [
        { key: "lead-dur-1", req: "Containment established per RRP work practices", reg: "40 CFR 745.85", critical: true },
        { key: "lead-dur-2", req: "HEPA vacuum/wet methods used", reg: "OSHA 1926.62 / RRP", critical: true },
        { key: "lead-dur-3", req: "Exposure monitoring at/above action level (30 µg/m³)", reg: "OSHA 1926.62", critical: true },
        { key: "lead-dur-4", req: "BLL monitoring every 2 months (first 6 months)", reg: "OSHA 1926.62", critical: true },
        { key: "lead-dur-5", req: "Non-certified workers trained on-site by Cert. Renovator", reg: "40 CFR 745", critical: false },
        { key: "lead-dur-6", req: "Waste handled per CO/EPA disposal requirements", reg: "Reg 19 / RRP", critical: true },
      ],
    },
    {
      section: "Post-Project",
      items: [
        { key: "lead-post-1", req: "Dust clearance sampling (floors ≤5, sills ≤40, troughs ≤100 µg/ft²)", reg: "Reg 19 / EPA", critical: true },
        { key: "lead-post-2", req: "Clearance report states hazards may remain even below DLAL", reg: "Reg 19 (CO-specific)", critical: true },
        { key: "lead-post-3", req: "Clearance report submitted", reg: "Reg 19", critical: true },
        { key: "lead-post-4", req: "RRP records retained for 3 years", reg: "40 CFR 745", critical: true },
        { key: "lead-post-5", req: "OSHA medical/exposure records retained 30 years", reg: "OSHA 1926.62", critical: true },
      ],
    },
  ],
  METH: [
    {
      section: "Assessment Phase",
      items: [
        { key: "meth-assess-1", req: "Law enforcement report obtained", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-assess-2", req: "State-certified Consultant (CIH) engaged", reg: "6 CCR 1014-3 / CRS 25-18.5-106", critical: true },
        { key: "meth-assess-3", req: "Consultant independent from contractor verified", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-assess-4", req: "Property personally inspected by Consultant", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-assess-5", req: "Assessment wipe sampling completed", reg: "6 CCR 1014-3-1-6.0", critical: true },
        { key: "meth-assess-6", req: "Chain-of-custody records initiated", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-assess-7", req: "Preliminary assessment report completed", reg: "6 CCR 1014-3", critical: true },
      ],
    },
    {
      section: "Decontamination Phase",
      items: [
        { key: "meth-decon-1", req: "State-certified contractor engaged", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-decon-2", req: "Contractor independent from consultant verified", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-decon-3", req: "Decontamination work plan prepared", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-decon-4", req: "HVAC shutdown and lockout completed", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-decon-5", req: "HEPA negative air unit installed", reg: "6 CCR 1014-3-1-5.0", critical: true },
        { key: "meth-decon-6", req: "Workers have 40hr HAZWOPER certification", reg: "OSHA 1910.120", critical: true },
        { key: "meth-decon-7", req: "Decon Supervisor on-site overseeing work", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-decon-8", req: "Ventilation system decontaminated (Appendix C)", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-decon-9", req: "All porous materials unable to be decontaminated removed", reg: "6 CCR 1014-3", critical: true },
      ],
    },
    {
      section: "Clearance Phase",
      items: [
        { key: "meth-clear-1", req: "Post-decon clearance sampling by independent Consultant", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-clear-2", req: "All samples ≤0.5 µg/100cm² (habitable areas)", reg: "6 CCR 1014-3-1-7.0", critical: true },
        { key: "meth-clear-3", req: "Limited exposure areas ≤4.0 µg/100cm²", reg: "6 CCR 1014-3-1-7.0", critical: false },
        { key: "meth-clear-4", req: "Painted surfaces ≤1.5 µg/100cm²", reg: "6 CCR 1014-3-1-7.0", critical: false },
        { key: "meth-clear-5", req: "Final clearance report prepared", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-clear-6", req: "Report submitted to governing body within 30 days", reg: "6 CCR 1014-3", critical: true },
        { key: "meth-clear-7", req: "Property removed from CDPHE registry (if applicable)", reg: "CRS 25-18.5", critical: false },
      ],
    },
  ],
  MOLD: [
    {
      section: "Assessment Phase",
      items: [
        { key: "mold-assess-1", req: "Moisture source identified and documented", reg: "EPA/IICRC S520", critical: true },
        { key: "mold-assess-2", req: "Mold condition classification determined (1, 2, or 3)", reg: "IICRC S520", critical: true },
        { key: "mold-assess-3", req: "Affected area measured and remediation level determined", reg: "EPA Guidelines", critical: true },
        { key: "mold-assess-4", req: "Pre-remediation sampling completed (air + surface)", reg: "IICRC S520", critical: false },
        { key: "mold-assess-5", req: "Occupant notification of mold condition", reg: "General Duty", critical: true },
        { key: "mold-assess-6", req: "Assessment by qualified professional (>100 sq ft)", reg: "EPA Guidelines", critical: true },
      ],
    },
    {
      section: "Remediation Phase",
      items: [
        { key: "mold-rem-1", req: "Containment established per EPA level (I–IV)", reg: "EPA Guidelines", critical: true },
        { key: "mold-rem-2", req: "Respiratory protection in place (N95 min, P100 for >10 sq ft)", reg: "OSHA 3160", critical: true },
        { key: "mold-rem-3", req: "HVAC system shut down in affected area", reg: "EPA/IICRC S520", critical: true },
        { key: "mold-rem-4", req: "Negative air pressure established (Level 3+)", reg: "EPA Guidelines", critical: true },
        { key: "mold-rem-5", req: "Porous materials with active growth removed and discarded", reg: "IICRC S520", critical: true },
        { key: "mold-rem-6", req: "Non-porous surfaces HEPA vacuumed and cleaned", reg: "EPA/IICRC S520", critical: true },
        { key: "mold-rem-7", req: "Indoor humidity maintained below 60%", reg: "OSHA 3160 / EPA", critical: true },
        { key: "mold-rem-8", req: "Workers medically evaluated for mold exposure", reg: "OSHA General Duty", critical: false },
      ],
    },
    {
      section: "Post-Remediation",
      items: [
        { key: "mold-post-1", req: "Visual inspection confirms no visible mold", reg: "EPA/IICRC S520", critical: true },
        { key: "mold-post-2", req: "Post-remediation air/surface sampling (Condition 1 or 2)", reg: "IICRC S520", critical: true },
        { key: "mold-post-3", req: "Moisture source corrected and verified", reg: "EPA Guidelines", critical: true },
        { key: "mold-post-4", req: "Clearance report prepared by independent assessor", reg: "IICRC S520", critical: true },
        { key: "mold-post-5", req: "Real estate disclosure filed if applicable", reg: "CO Disclosure Law", critical: false },
        { key: "mold-post-6", req: "Ongoing moisture monitoring plan established", reg: "EPA Guidelines", critical: false },
      ],
    },
  ],
};
