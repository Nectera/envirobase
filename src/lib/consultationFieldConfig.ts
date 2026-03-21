/**
 * Consultation Estimate — Step 2 Field Configuration
 *
 * Tenants can fully customize the informational fields on Step 2 (Field Consultation).
 * Formula-feeding fields (daysNeeded, crewSize, driveTimeHours, difficultyRating,
 * wasteYards, namsCount, permitRequired) are always present and cannot be removed —
 * they drive the cost calculations on Steps 3–7.
 *
 * Config is stored as a Setting with key `consultationFieldConfig_{orgId}`.
 */

export type FieldType = "text" | "textarea" | "number" | "select" | "checkbox" | "checkboxGroup";

export interface ConsultationFieldDef {
  /** Unique stable ID (used as key in customFields JSON) */
  id: string;
  /** Display label */
  label: string;
  /** Field input type */
  type: FieldType;
  /** Options for select / checkboxGroup types */
  options?: string[];
  /** Placeholder text */
  placeholder?: string;
  /** Group heading this field falls under (for visual grouping) */
  group?: string;
  /** Whether this field spans full width (col-span-full) */
  fullWidth?: boolean;
}

/**
 * The default Step 2 field config — matches the original hardcoded fields.
 * When a tenant has no custom config saved, this is used.
 */
export const DEFAULT_CONSULTATION_FIELDS: ConsultationFieldDef[] = [
  // Site Visit Requirements (checkbox group)
  {
    id: "siteVisitRequirements",
    label: "Site Visit Requirements",
    type: "checkboxGroup",
    options: [
      "Met with Customer",
      "Thoroughly explained timeline and procedure",
      "Gave business card",
      "Received and noted scope of work",
      "Sketched project via Xactimate or Matterport",
      "Clear photos taken",
    ],
    fullWidth: true,
  },

  // Scope of Work (textarea)
  {
    id: "scopeOfWork",
    label: "Scope of Work",
    type: "textarea",
    placeholder: "Describe the scope of work...",
    fullWidth: true,
  },

  // Payment & Loss
  {
    id: "paymentType",
    label: "Payment Type",
    type: "select",
    options: ["Insurance", "Self Pay"],
    group: "Project Details",
  },
  {
    id: "typeOfLoss",
    label: "Type of Loss",
    type: "text",
    group: "Project Details",
  },
  {
    id: "vacateNeeded",
    label: "Vacate Property",
    type: "select",
    options: ["Yes", "No"],
    group: "Project Details",
  },

  // Site Conditions (checkboxes)
  {
    id: "septicSystem",
    label: "Septic System",
    type: "checkbox",
    group: "Site Conditions",
  },
  {
    id: "sufficientPower",
    label: "Power Available",
    type: "checkbox",
    group: "Site Conditions",
  },
  {
    id: "goodWaterSource",
    label: "Water Source",
    type: "checkbox",
    group: "Site Conditions",
  },

  // Technical Details
  {
    id: "airClearances",
    label: "Air Clearances",
    type: "text",
    group: "Technical Details",
  },
  {
    id: "projectDesign",
    label: "Project Design",
    type: "text",
    group: "Technical Details",
  },
  {
    id: "deconLoadout",
    label: "Decon/Loadout Location",
    type: "text",
    group: "Technical Details",
  },
  {
    id: "ductCleaning",
    label: "Duct Cleaning Eligibility",
    type: "text",
    group: "Technical Details",
  },

  // Dumpster
  {
    id: "dumpsterNeeded",
    label: "Dumpster Needed",
    type: "checkbox",
    group: "Dumpster & Equipment",
  },
  {
    id: "asbestosDumpster",
    label: "Asbestos Dumpster",
    type: "checkbox",
    group: "Dumpster & Equipment",
  },
  {
    id: "dumpsterSwaps",
    label: "Dumpster Swaps",
    type: "text",
    group: "Dumpster & Equipment",
  },
  {
    id: "openDumpster",
    label: "Open Dumpster",
    type: "text",
    group: "Dumpster & Equipment",
  },
  {
    id: "dumpsterPlacement",
    label: "Dumpster Placement",
    type: "text",
    group: "Dumpster & Equipment",
  },
  {
    id: "portableBathroom",
    label: "Portable Bathroom",
    type: "checkbox",
    group: "Dumpster & Equipment",
  },

  // Material Details
  {
    id: "floringLayers",
    label: "Flooring Layers",
    type: "text",
    group: "Material Details",
  },
  {
    id: "dryWallLayers",
    label: "Drywall Layers",
    type: "text",
    group: "Material Details",
  },
  {
    id: "hvacRemoval",
    label: "HVAC/Ducting",
    type: "text",
    group: "Material Details",
  },
  {
    id: "acmDisturbed",
    label: "Spill/ACM Quantity",
    type: "text",
    group: "Material Details",
  },

  // Contents & Customer
  {
    id: "contentsRemove",
    label: "Contents Removal",
    type: "text",
    group: "Contents & Customer",
  },
  {
    id: "furnitureAppliances",
    label: "Furniture/Appliances",
    type: "text",
    group: "Contents & Customer",
  },
  {
    id: "customerInformed",
    label: "Customer Responsibilities",
    type: "text",
    group: "Contents & Customer",
    fullWidth: true,
  },

  // Field Notes
  {
    id: "fieldNotes",
    label: "Field Notes",
    type: "textarea",
    placeholder: "Additional field notes...",
    fullWidth: true,
  },
];

/**
 * IDs of fields that map to existing typed columns on ConsultationEstimate.
 * Values for these fields are saved directly to their columns.
 * Any field ID not in this list is treated as a custom field and stored in the `data` JSON column.
 */
export const KNOWN_COLUMN_FIELDS = new Set([
  "siteVisitRequirements",
  "scopeOfWork",
  "paymentType",
  "typeOfLoss",
  "vacateNeeded",
  "septicSystem",
  "sufficientPower",
  "goodWaterSource",
  "airClearances",
  "projectDesign",
  "deconLoadout",
  "ductCleaning",
  "dumpsterNeeded",
  "asbestosDumpster",
  "dumpsterSwaps",
  "openDumpster",
  "dumpsterPlacement",
  "portableBathroom",
  "floringLayers",
  "dryWallLayers",
  "hvacRemoval",
  "acmDisturbed",
  "contentsRemove",
  "furnitureAppliances",
  "customerInformed",
  "fieldNotes",
]);

/**
 * Formula-feeding field IDs that are always rendered (cannot be removed by tenants).
 * These are rendered separately in the form, not from the config.
 */
export const FORMULA_FIELDS = [
  "daysNeeded",
  "crewSize",
  "driveTimeHours",
  "difficultyRating",
  "wasteYards",
  "namsCount",
  "permitRequired",
];
