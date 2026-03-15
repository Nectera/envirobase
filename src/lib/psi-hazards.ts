// PSI / JHA / SPA hazard checklist definitions
// Optimized for Xtract Environmental Services — asbestos, lead, and meth lab remediation

export const ENVIRONMENT_HAZARDS = [
  { key: "acm_present", label: "ACM (Asbestos-Containing Material) Present" },
  { key: "lead_paint_dust", label: "Lead-Based Paint / Lead Dust Present" },
  { key: "meth_contamination", label: "Methamphetamine Contamination Present" },
  { key: "containment_integrity", label: "Containment / Enclosure Integrity" },
  { key: "negative_air", label: "Negative Air Pressure Established" },
  { key: "air_monitoring", label: "Air Monitoring in Place (PCM/TEM)" },
  { key: "regulated_area", label: "Regulated Area Posted & Barricaded" },
  { key: "decon_unit", label: "Decontamination Unit Setup & Functional" },
  { key: "sds_reviewed", label: "SDS Reviewed for Chemicals Used" },
  { key: "ventilation", label: "Ventilation / Exhaust Required" },
  { key: "weather_conditions", label: "Weather / Conditions" },
  { key: "heat_cold", label: "Heat Stress / Cold Exposure" },
  { key: "lighting", label: "Lighting Levels Adequate" },
  { key: "housekeeping", label: "Housekeeping / Debris Management" },
  { key: "waste_staging", label: "Waste Staging Area Designated" },
];

export const ERGONOMICS_HAZARDS = [
  { key: "tight_area", label: "Working in Tight / Confined Area" },
  { key: "line_of_fire", label: "Part of Body in Line of Fire" },
  { key: "above_head", label: "Working Above Your Head (Ceiling Removal)" },
  { key: "pinch_points", label: "Pinch Points Identified" },
  { key: "repetitive_motion", label: "Repetitive Motion (Scraping / Removal)" },
  { key: "manual_handling", label: "Manual Handling of Waste Bags / Materials" },
  { key: "awkward_positions", label: "Awkward Positions (Crawlspaces / Attics)" },
];

export const HEIGHT_HAZARDS = [
  { key: "ladders", label: "Ladders" },
  { key: "scaffold", label: "Scaffolding (Inspected & Tagged)" },
  { key: "barricades_flagging", label: "Barricades / Flagging / Signs in Place" },
  { key: "hole_coverings", label: "Hole Coverings in Place" },
  { key: "falling_items", label: "Protect from Falling Items / Debris" },
  { key: "others_overhead", label: "Others Working Overhead / Below" },
  { key: "fall_arrest", label: "Fall Arrest Systems" },
  { key: "elevated_platforms", label: "Elevated Work Platforms / Lifts" },
];

export const ACTIVITY_HAZARDS = [
  { key: "wet_removal", label: "Wet Removal Methods (Amended Water)" },
  { key: "dry_removal", label: "Dry Removal (Glovebag / Controlled)" },
  { key: "hepa_vacuuming", label: "HEPA Vacuuming" },
  { key: "containment_construction", label: "Containment Construction / Poly Sheeting" },
  { key: "demolition", label: "Demolition / Material Removal" },
  { key: "chemical_application", label: "Chemical Application (Encapsulant / Sealant / Solvent)" },
  { key: "waste_bagging", label: "Waste Bagging / Drum Packing / Load-Out" },
  { key: "sharp_debris", label: "Sharp Debris / Nails / Broken Materials" },
  { key: "airborne_particles", label: "Airborne Particles / Fibers" },
  { key: "energized_equipment", label: "Working Near Energized / Live Systems" },
  { key: "electrical_cords", label: "Electrical Cords / Tools — Condition" },
  { key: "tools_inspected", label: "Equipment / Tools Inspected" },
  { key: "mobile_equipment", label: "Mobile Equipment / Vehicle" },
  { key: "confined_space", label: "Confined Space Entry" },
  { key: "water_damage_mold", label: "Water Damage / Mold Co-Occurrence" },
  { key: "structural_instability", label: "Structural Instability / Compromised Surfaces" },
];

export const ACCESS_EGRESS_HAZARDS = [
  { key: "decon_corridor", label: "Decontamination Corridor Clear & Functional" },
  { key: "containment_entry", label: "Containment Entry / Exit Procedures Reviewed" },
  { key: "regulated_boundaries", label: "Regulated Area Boundaries Clearly Marked" },
  { key: "slip_trip", label: "Slip / Trip Potential (Poly Sheeting / Wet Surfaces)" },
  { key: "permits_in_place", label: "Required Permits in Place (CDPHE / EPA / Local)" },
  { key: "walkways_roadways", label: "Walkways / Roadways" },
  { key: "emergency_exits", label: "Emergency Exits Identified & Unobstructed" },
];

export const PERSONAL_LIMITATIONS = [
  { key: "clear_instructions", label: "Clear Instructions Provided" },
  { key: "trained_task", label: "Trained for Task (Asbestos / Lead / Meth Certifications Current)" },
  { key: "medical_clearance", label: "Medical Surveillance / Respirator Fit Test Current" },
  { key: "distractions", label: "Distractions in Work Area" },
  { key: "working_alone", label: "Working Alone (Communication Plan)" },
  { key: "lift_heavy", label: "Lift Too Heavy / Awkward Position" },
  { key: "noise_level", label: "External Noise Level" },
  { key: "physical_limitations", label: "Physical Limitations" },
  { key: "first_aid", label: "First Aid / Emergency Supplies Available" },
  { key: "fatigue_hydration", label: "Fatigue / Hydration Concerns (Suited Work)" },
];

export const PPE_REQUIREMENTS = [
  { key: "half_face_p100", label: "Half-Face Respirator w/ P100 Cartridges" },
  { key: "full_face_p100", label: "Full-Face Respirator w/ P100 / OV Cartridges" },
  { key: "papr", label: "PAPR (Powered Air-Purifying Respirator)" },
  { key: "tyvek_suit", label: "Disposable Coverall (Tyvek / Equivalent)" },
  { key: "nitrile_gloves", label: "Disposable Gloves (Nitrile)" },
  { key: "rubber_gloves", label: "Chemical-Resistant Gloves (Rubber / Butyl)" },
  { key: "boot_covers", label: "Boot Covers / Disposable Shoe Covers" },
  { key: "rubber_boots", label: "Rubber Boots (Wet Work)" },
  { key: "duct_tape_seams", label: "Duct Tape Seams (Wrists / Ankles / Hood)" },
  { key: "safety_goggles", label: "Safety Goggles (Non-Vented)" },
  { key: "safety_glasses", label: "Safety Glasses" },
  { key: "face_shield", label: "Face Shield" },
  { key: "hard_hat", label: "Hard Hat" },
  { key: "hearing_protection", label: "Hearing Protection" },
  { key: "harness_lanyards", label: "Harness / Lanyards" },
  { key: "reflective_vest", label: "Reflective / High-Visibility Vest" },
  { key: "footwear", label: "Steel-Toe Footwear" },
  { key: "gas_monitor", label: "4-Gas Monitor" },
];

export const RISK_MATRIX = {
  outcomes: [
    { label: "High", range: "(8-10)", color: "bg-red-600 text-white" },
    { label: "Significant", range: "(6-7)", color: "bg-orange-500 text-white" },
    { label: "Moderate", range: "(5)", color: "bg-yellow-400 text-black" },
    { label: "Low", range: "(2-4)", color: "bg-green-500 text-white" },
  ],
  // matrix[likelihood-1][consequence-1] = risk rating
  matrix: [
    [2, 3, 4, 5, 6],  // Rare
    [3, 4, 5, 6, 7],  // Unlikely
    [4, 5, 6, 7, 8],  // Possible
    [5, 6, 7, 8, 9],  // Likely
    [6, 7, 8, 9, 10], // Almost Certain
  ],
  likelihoods: ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"],
  consequences: ["Insignificant", "Minor", "Moderate", "Major", "Catastrophic"],
};
