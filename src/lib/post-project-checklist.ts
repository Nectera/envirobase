// Post Project Inspection Guide — Checklist definitions
// Based on EnviroBase Environmental Services PM inspection form

export type ChecklistSection = {
  section: string;
  items: { key: string; label: string }[];
};

export const POST_PROJECT_SECTIONS: ChecklistSection[] = [
  {
    section: "Customer Communication",
    items: [
      { key: "customer_contacted_prior", label: "Customer contacted at least a day prior to inspection" },
      { key: "customer_onsite", label: "Customer able to be onsite to inspect quality and thoroughness" },
      { key: "cert_of_completion_signed", label: "Certificate of completion signed" },
      { key: "google_review_obtained", label: "Google review obtained" },
      { key: "plumbing_disclaimer", label: "Customer aware we cannot reinstall plumbing (toilets, dishwashers, etc.)" },
    ],
  },
  {
    section: "Cleanliness",
    items: [
      { key: "containment_removed", label: "All containment materials removed completely" },
      { key: "equipment_stored_clean", label: "All equipment stored neatly in trailer, clean of tape or glue" },
      { key: "work_area_clear", label: "Work area clear of any debris or dust" },
      { key: "waste_sealed_labeled", label: "All waste sealed properly with labels and in proper containers" },
    ],
  },
  {
    section: "Organization",
    items: [
      { key: "furniture_replaced", label: "Furniture, decor, etc. placed back in original location" },
      { key: "screens_doors_replaced", label: "Window screens and doors put back if removed" },
      { key: "water_valves_off", label: "All water valves turned off and no leaks present" },
      { key: "hvac_reset", label: "Heat or A/C put back to same temperature as arrival" },
      { key: "loose_fixtures_secured", label: "Loose light fixtures, faucets, toilets, cabinets, etc. stored safely" },
      { key: "appliances_replaced", label: "Appliances put back in place or customer-approved area" },
      { key: "key_returned", label: "Key returned to customer or lockbox" },
    ],
  },
  {
    section: "Damages",
    items: [
      { key: "damages_disclosed", label: "Damages, if any, disclosed to customer" },
      { key: "damage_resolution_agreed", label: "Resolution to any damages agreed to" },
      { key: "damage_photos_recorded", label: "Photos of damages recorded on certificate of completion" },
      { key: "damages_communicated_office", label: "Damages and resolution communicated to office" },
    ],
  },
  {
    section: "Demobilization",
    items: [
      { key: "final_walkthrough", label: "Final walkthrough completed" },
      { key: "driveway_photos", label: "Photos taken of driveway after trailer/dumpster placement" },
      { key: "manifest_completed", label: "Manifest filled out and placed on dumpster or brought to office" },
      { key: "office_notified_removal", label: "Office notified to remove dumpster and portable bathroom" },
    ],
  },
];

// Flat list of all checklist item keys
export const ALL_POST_PROJECT_ITEMS = POST_PROJECT_SECTIONS.flatMap((s) => s.items);
