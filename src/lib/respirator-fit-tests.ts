// Respirator Fit Test items — per OSHA 29 CFR 1910.134 Appendix A

export const FIT_TEST_ITEMS = [
  { key: "negative_pressure", label: "Negative Pressure" },
  { key: "positive_pressure", label: "Positive Pressure" },
  { key: "irritant_smoke", label: "Irritant Smoke" },
  { key: "ampule", label: "Ampule" },
  { key: "odorous_vapor", label: "Odorous Vapor" },
  { key: "taste", label: "Taste" },
  { key: "aerosol", label: "Aerosol" },
  { key: "gas", label: "Gas" },
  { key: "other", label: "Other" },
];

export const RESPIRATOR_TYPES = [
  "Half-Face APR (P100)",
  "Full-Face APR (P100)",
  "Full-Face APR (P100/OV)",
  "PAPR",
  "Supplied Air Respirator (SAR)",
  "SCBA",
];

export const RESPIRATOR_SIZES = ["Small", "Medium", "Large"];

// OSHA qualitative fit test criteria (29 CFR 1910.134 Appendix A)
export const FIT_TEST_CRITERIA = [
  "1. Normal breathing",
  "2. Deep breathing",
  "3. Head side to side",
  "4. Head up and down",
  "5. Talking (rainbow passage)",
  "6. Bending over",
  "7. Normal breathing",
];
