// Default material prices from Pre-Cost Template
// Prices can be updated here — they serve as defaults when creating a new consultation estimate

export type MaterialDefault = {
  name: string;
  unit: string;
  defaultPrice: number;
  // Per-hour multiplier for auto-calculating quantity from total labor hours
  // null = must be entered manually, 0 = not auto-populated
  perHourMultiplier: number | null;
  // Special formula type (overrides perHourMultiplier)
  specialFormula?: "wasteYards" | "fuelSurcharge" | "shampoo" | "surfactant";
};

export const DEFAULT_MATERIALS: MaterialDefault[] = [
  { name: "10 Mil Poly", unit: "Roll", defaultPrice: 270.0, perHourMultiplier: null },
  { name: "4 Mil Poly", unit: "Roll", defaultPrice: 45.0, perHourMultiplier: 1 / 60 },
  { name: '4" Scraper Blades', unit: "Per", defaultPrice: 1.86, perHourMultiplier: null },
  { name: "6 Mil Poly", unit: "Roll", defaultPrice: 68.0, perHourMultiplier: 1 / 40 },
  { name: "6 Mil Poly Bags (Clear)", unit: "Bag", defaultPrice: 0.68, perHourMultiplier: null },
  { name: '6 Mil Poly Bags (Printed) 30"x40"', unit: "Bag", defaultPrice: 0.68, perHourMultiplier: 2 / 3 },
  { name: '6 Mil Poly Bags (Printed) 33"x50"', unit: "Bag", defaultPrice: 1.16, perHourMultiplier: null },
  { name: '8" Scraper Blades', unit: "Per", defaultPrice: 0.80, perHourMultiplier: null },
  { name: "Asbestos Label", unit: "Roll", defaultPrice: 25.0, perHourMultiplier: null },
  { name: "Asbestos Sign", unit: "Per", defaultPrice: 0.17, perHourMultiplier: null },
  { name: "Black Gloves", unit: "Per DZ", defaultPrice: 25.80, perHourMultiplier: null },
  { name: "Buffing Pad", unit: "Per", defaultPrice: 61.50, perHourMultiplier: null },
  { name: "Burrito Bag", unit: "Per", defaultPrice: 315.0, perHourMultiplier: null, specialFormula: "wasteYards" },
  { name: "Cotton Suit", unit: "Per", defaultPrice: 1.20, perHourMultiplier: 1 / 3 },
  { name: "Cotton Gloves", unit: "Per", defaultPrice: 0.80, perHourMultiplier: 1 / 20 },
  { name: "Doodle Bug", unit: "Per", defaultPrice: 2.75, perHourMultiplier: null },
  { name: "DOT Class 9 Label", unit: "Roll", defaultPrice: 20.0, perHourMultiplier: null },
  { name: "First Aid Kit", unit: "Per", defaultPrice: 20.70, perHourMultiplier: null },
  { name: "Half-Face Filter", unit: "Per", defaultPrice: 10.50, perHourMultiplier: null },
  { name: "HEPA for Vac", unit: "Per", defaultPrice: 52.0, perHourMultiplier: 1 / 60 },
  { name: "HEPA Vac Bag", unit: "Per", defaultPrice: 1.75, perHourMultiplier: null },
  { name: "Lay Flat", unit: "Roll", defaultPrice: 84.75, perHourMultiplier: null },
  { name: "Lumber", unit: "Per", defaultPrice: 1.0, perHourMultiplier: null },
  { name: "Masking Tape", unit: "Roll", defaultPrice: 4.58, perHourMultiplier: null },
  { name: "Mastic Remover", unit: "Bucket", defaultPrice: 50.70, perHourMultiplier: null },
  { name: "NAM HEPA", unit: "Per", defaultPrice: 120.0, perHourMultiplier: null },
  { name: "PAPR Filter", unit: "Per", defaultPrice: 11.0, perHourMultiplier: 1 / 30 },
  { name: "Pre-Filter", unit: "Per", defaultPrice: 2.15, perHourMultiplier: 1 / 12 },
  { name: "Rags 50 lb", unit: "Box", defaultPrice: 50.0, perHourMultiplier: 1 / 240 },
  { name: 'Red 3" Tape', unit: "Roll", defaultPrice: 11.0, perHourMultiplier: 1 / 3 },
  { name: "Sampling Cassettes", unit: "BX", defaultPrice: 26.0, perHourMultiplier: null },
  { name: "Secondary Filter", unit: "Per", defaultPrice: 5.17, perHourMultiplier: 1 / 16 },
  { name: "Shampoo", unit: "Per", defaultPrice: 2.50, perHourMultiplier: null, specialFormula: "shampoo" },
  { name: "Shockwave", unit: "Per Gallon", defaultPrice: 47.0, perHourMultiplier: null },
  { name: "Shower Towels", unit: "Box", defaultPrice: 32.0, perHourMultiplier: 1 / 80 },
  { name: "Spray Glue", unit: "Can", defaultPrice: 3.75, perHourMultiplier: 1 / 12 },
  { name: "Staples", unit: "Box", defaultPrice: 8.50, perHourMultiplier: 1 / 240 },
  { name: "Surfactant", unit: "Bucket", defaultPrice: 29.50, perHourMultiplier: null, specialFormula: "surfactant" },
  { name: "Tyvek Suit", unit: "Per", defaultPrice: 3.0, perHourMultiplier: 1 / 3 },
  { name: "Utility Knife Blades", unit: "Box", defaultPrice: 10.0, perHourMultiplier: null },
  { name: "Vac Hose", unit: "Per", defaultPrice: 59.0, perHourMultiplier: null },
  { name: "Wire Toothbrush", unit: "Per", defaultPrice: 0.60, perHourMultiplier: null },
  { name: "Wire Wooden Brush", unit: "Per", defaultPrice: 1.20, perHourMultiplier: null },
  { name: "Mask Wipes", unit: "Per", defaultPrice: 0.05, perHourMultiplier: 1 / 4 },
  { name: "Water", unit: "Case", defaultPrice: 5.0, perHourMultiplier: 1 / 60 },
  { name: "Misc.", unit: "", defaultPrice: 200.0, perHourMultiplier: 1 / 120 },
  { name: "Fuel Surcharge", unit: "", defaultPrice: 0, perHourMultiplier: null, specialFormula: "fuelSurcharge" },
];

/**
 * Calculate auto-populated material quantity based on total labor hours and waste yards
 */
export function calcMaterialQty(
  material: MaterialDefault,
  totalHours: number,
  wasteYards: number,
  materialSubtotal: number
): number {
  if (material.specialFormula === "wasteYards") {
    return wasteYards / 35;
  }
  if (material.specialFormula === "shampoo") {
    return totalHours / 360;
  }
  if (material.specialFormula === "surfactant") {
    return totalHours / 940;
  }
  if (material.specialFormula === "fuelSurcharge") {
    // Fuel surcharge is ~2.56% of material subtotal (before fuel)
    return 0; // cost is calculated separately
  }
  if (material.perHourMultiplier !== null) {
    return totalHours * material.perHourMultiplier;
  }
  return 0;
}

export function calcFuelSurcharge(materialSubtotalBeforeFuel: number): number {
  return materialSubtotalBeforeFuel * 0.0256;
}

// Default Operating Cost rate per labor hour (combined overhead)
export const DEFAULT_OPS_RATE = 48.85;

// Labor rates from Pre-Cost Template
export const LABOR_RATES = {
  supervisor: { hourly: 30.0, taxBurden: 3.09 },
  technician: { hourly: 27.0, taxBurden: 2.781 },
};

// office address for miles calculation
export const DEFAULT_OFFICE = {
  address: "903 5th St, Greeley, CO 80631",
  lat: 40.4189,
  lng: -104.7064,
};

// Default COGS line items with readable notes
export const DEFAULT_COGS = [
  { item: "Waste", notes: "Rate: $30.50/cubic yard. Hauling varies — $35/yd for western slope." },
  { item: "Permit", notes: "30-day permit: $181 (under 260 lf/160 sf) or $401 (over). 90-day: $800." },
  { item: "Clearance", notes: "$425 standard. $600 weekend. $1,200 if 45-75 miles. Farther needs AMS estimate." },
  { item: "Per Diem 45+ Miles", notes: "$35/person/day. From residence to job site — only if 45+ miles." },
  { item: "Per Diem Resort Town", notes: "Additional per diem for mountain/resort towns only." },
  { item: "Lodging", notes: "Reference hotel rates in the project area. Required if job is too far for daily commute." },
  { item: "Vehicle", notes: "Per trip cost. Double qty if sending an additional vehicle or employee vehicle." },
  { item: "Trailer", notes: "Trailer delivery/pickup cost per trip." },
  { item: "Referral Fee", notes: "See Referral Commission document for partner rates (typically 10% of estimate)." },
  { item: "Sub Contractors", notes: "Sub costs. NOTE: Sub hours still need added to Labor for accurate material calc." },
  { item: "Project Design", notes: "Required if project is over 3,000 sf of material. Typically $500-$1,200." },
  { item: "Variance", notes: "Buffer for unexpected costs or scope changes." },
];

// Site visit requirement options (checkboxes from consultation form)
export const SITE_VISIT_REQUIREMENTS = [
  "Met with Customer",
  "Thoroughly explained timeline and procedure",
  "Gave business card",
  "Received and noted scope of work",
  "Sketched project via Xactimate or Matterport",
  "Clear photos taken",
];

// Waste rate for auto-calculating COGS
export const WASTE_RATE_PER_YARD = 30.50;
// Hauling rate per yard (standard / west)
export const HAULING_RATE_STANDARD = 30.50;
export const HAULING_RATE_WEST = 35.0;

// Vehicle cost per trip based on miles
export function calcVehicleTripCost(miles: number): number {
  // IRS mileage rate approximation × 2 (round trip)
  return miles * 2 * 0.67;
}

// Trailer cost per trip based on miles
export function calcTrailerTripCost(miles: number): number {
  return miles * 2 * 0.28;
}

// Default COGS rates - all configurable via settings
export const DEFAULT_COGS_RATES = {
  permitCost: 401,
  clearanceCost: 425,
  perDiemRate: 35,
  perDiemMileThreshold: 45,
  vehicleMileageRate: 0.67,
  trailerMileageRate: 0.28,
  trailerDefaultQty: 2,
  supervisorHourly: 30.0,
  supervisorTaxBurden: 3.09,
  technicianHourly: 27.0,
  technicianTaxBurden: 2.781,
  opsPerHourRate: 48.85,
  wasteRatePerYard: 30.50,
  haulingRateStandard: 30.50,
  haulingRateWest: 35.0,
  fuelSurchargePercent: 2.56,
};

export type COGSRates = typeof DEFAULT_COGS_RATES;
