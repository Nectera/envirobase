"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import {
  LABOR_RATES,
  DEFAULT_COGS,
  DEFAULT_MATERIALS,
  DEFAULT_OPS_RATE,
  SITE_VISIT_REQUIREMENTS,
  XTRACT_OFFICE,
  WASTE_RATE_PER_YARD,
  calcMaterialQty,
  calcFuelSurcharge,
  calcVehicleTripCost,
  calcTrailerTripCost,
  DEFAULT_COGS_RATES,
  type COGSRates,
} from "@/lib/materials";
import { ChevronDown, ChevronUp, Calculator, MapPin, Search, X } from "lucide-react";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  description?: string;
  notes?: string;
  companyId: string;
  status?: string;
  company: { id: string; name: string; referralFeeEnabled?: boolean; referralFeePercent?: number | null };
}

interface CompanyOption {
  id: string;
  name: string;
  referralFeeEnabled?: boolean;
  referralFeePercent?: number | null;
}

interface ContactOption {
  id: string;
  name: string;
  companyId: string;
}

interface ConsultationFormData {
  // Step 1: Site Info
  customerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  milesFromShop: number;
  projectDate: string;

  // Step 2: Field Consultation
  siteVisitRequirements: string[];
  scopeOfWork: string;
  daysNeeded: number;
  crewSize: number;
  paymentType: string;
  typeOfLoss: string;
  septicSystem: boolean;
  vacateNeeded: string;
  driveTimeHours: number;
  sufficientPower: boolean;
  goodWaterSource: boolean;
  difficultyRating: number;
  wasteYards: number;
  permitRequired: string;
  airClearances: string;
  projectDesign: string;
  deconLoadout: string;
  namsCount: number;
  ductCleaning: string;
  dumpsterNeeded: boolean;
  asbestosDumpster: boolean;
  dumpsterSwaps: string;
  openDumpster: string;
  dumpsterPlacement: string;
  portableBathroom: boolean;
  floringLayers: string;
  dryWallLayers: string;
  hvacRemoval: string;
  acmDisturbed: string;
  contentsRemove: string;
  furnitureAppliances: string;
  customerInformed: string;
  fieldNotes: string;

  // Step 3: Labor
  laborSupervisor: {
    regularHours: number;
    otHours: number;
  };
  laborTechnician: {
    regularHours: number;
    otHours: number;
  };

  // Step 4: Operating Costs
  opsPerHourRate: number;

  // Step 5: COGS
  cogs: Array<{
    item: string;
    qty: number;
    cost: number;
  }>;

  // Step 6: Materials
  materials: Array<{
    name: string;
    qty: number;
    cost: number;
  }>;

  // Step 7: Markup & Pricing
  markupPercent: number;
  customerPriceOverride: number | null;
  serviceDescription: string;
}

// Colorado city lat/lng lookup for miles estimation
const CO_CITIES: Record<string, { lat: number; lng: number }> = {
  denver: { lat: 39.7392, lng: -104.9903 },
  boulder: { lat: 40.015, lng: -105.2705 },
  "fort collins": { lat: 40.5853, lng: -105.0844 },
  greeley: { lat: 40.4259, lng: -104.7019 },
  loveland: { lat: 40.3961, lng: -105.0713 },
  longmont: { lat: 40.1672, lng: -105.101 },
  "colorado springs": { lat: 38.8339, lng: -104.8202 },
  pueblo: { lat: 38.2544, lng: -104.6091 },
  "grand junction": { lat: 39.0639, lng: -108.5506 },
  "steamboat springs": { lat: 40.4849, lng: -106.8317 },
  vail: { lat: 39.6403, lng: -106.3742 },
  aspen: { lat: 39.1911, lng: -106.8175 },
  durango: { lat: 37.2807, lng: -107.8804 },
  "estes park": { lat: 40.3772, lng: -105.5217 },
  brighton: { lat: 39.9844, lng: -104.8042 },
  thornton: { lat: 39.8862, lng: -104.9743 },
  westminster: { lat: 39.8359, lng: -104.9987 },
  arvada: { lat: 39.8047, lng: -105.0845 },
  lakewood: { lat: 39.7589, lng: -105.1408 },
  aurora: { lat: 39.7294, lng: -104.8202 },
};

// Haversine formula to calculate distance between two lat/lng points
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate miles from office to city
function estimateMilesToCity(city: string): number {
  const normalizedCity = city.toLowerCase().trim();
  const cityCoords = CO_CITIES[normalizedCity];
  if (cityCoords) {
    return Math.round(
      haversineDistance(
        XTRACT_OFFICE.lat,
        XTRACT_OFFICE.lng,
        cityCoords.lat,
        cityCoords.lng
      )
    );
  }
  // Default to 50 miles if city not found
  return 50;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface ConsultationFormProps {
  lead?: Lead | null;
  editId?: string | null;
  initialData?: any | null;
  companies?: CompanyOption[];
  leads?: Lead[];
  contacts?: ContactOption[];
  settingsOpsRate?: number;
  cogsRates?: Partial<COGSRates>;
}

export default function ConsultationForm({ lead, editId, initialData, companies = [], leads = [], contacts = [], settingsOpsRate, cogsRates: propCogsRates }: ConsultationFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const isEditMode = !!editId;

  // Merge provided COGS rates with defaults (memoized with JSON key to avoid infinite re-renders)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rates = useMemo(() => ({ ...DEFAULT_COGS_RATES, ...propCogsRates }), [JSON.stringify(propCogsRates)]);

  // Lead/Company/Contact selection state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(lead || null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(lead?.companyId || "");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const leadSearchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (leadSearchRef.current && !leadSearchRef.current.contains(e.target as Node)) {
        setShowLeadDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered leads for search
  const filteredLeads = useMemo(() => {
    let filtered = leads;
    if (selectedCompanyId) {
      filtered = filtered.filter((l) => l.companyId === selectedCompanyId);
    }
    if (leadSearch.trim()) {
      const q = leadSearch.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
          l.address?.toLowerCase().includes(q) ||
          l.company?.name?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q)
      );
    }
    return filtered.slice(0, 20);
  }, [leads, selectedCompanyId, leadSearch]);

  // Available contacts for selected company
  const availableContacts = useMemo(() => {
    if (!selectedCompanyId) return contacts;
    return contacts.filter((c) => c.companyId === selectedCompanyId);
  }, [contacts, selectedCompanyId]);

  // Handle selecting a lead - auto-populate form fields
  const handleSelectLead = useCallback((l: Lead) => {
    setSelectedLead(l);
    setSelectedCompanyId(l.companyId || "");
    setShowLeadDropdown(false);
    setLeadSearch("");

    // Auto-fill form fields from lead
    setFormData((prev) => ({
      ...prev,
      customerName: `${l.firstName} ${l.lastName}`,
      address: l.address || prev.address,
      city: l.city || prev.city,
      state: l.state || prev.state || "CO",
      zip: l.zip || prev.zip,
      scopeOfWork: l.description || l.notes || prev.scopeOfWork,
    }));
  }, []);

  // Handle clearing lead selection
  const handleClearLead = useCallback(() => {
    setSelectedLead(null);
    setLeadSearch("");
  }, []);

  // Build initial form data from existing record or defaults
  const buildInitialFormData = (): ConsultationFormData => {
    if (initialData) {
      return {
        customerName: initialData.customerName || "",
        address: initialData.address || "",
        city: initialData.city || "",
        state: initialData.state || "CO",
        zip: initialData.zip || "",
        milesFromShop: initialData.milesFromShop || 0,
        projectDate: initialData.projectDate ? initialData.projectDate.split("T")[0] : new Date().toISOString().split("T")[0],
        siteVisitRequirements: initialData.siteVisitRequirements || [],
        scopeOfWork: initialData.scopeOfWork || "",
        daysNeeded: initialData.daysNeeded ?? 0,
        crewSize: initialData.crewSize ?? 0,
        paymentType: initialData.paymentType || "",
        typeOfLoss: initialData.typeOfLoss || initialData.lossType || "",
        septicSystem: initialData.septicSystem || false,
        vacateNeeded: initialData.vacateNeeded || initialData.vacateProperty || "",
        driveTimeHours: initialData.driveTimeHours || 0,
        sufficientPower: initialData.sufficientPower ?? initialData.powerAvailable ?? false,
        goodWaterSource: initialData.goodWaterSource ?? initialData.waterSource ?? false,
        difficultyRating: initialData.difficultyRating || 3,
        wasteYards: initialData.wasteYards || (initialData.wasteDescription ? parseFloat(initialData.wasteDescription) || 0 : 0),
        permitRequired: initialData.permitRequired || initialData.permitNeeded || "",
        airClearances: initialData.airClearances || "",
        projectDesign: initialData.projectDesign || "",
        deconLoadout: initialData.deconLoadout || initialData.deconLocation || "",
        namsCount: initialData.namsCount || 0,
        ductCleaning: initialData.ductCleaning || "",
        dumpsterNeeded: initialData.dumpsterNeeded || false,
        asbestosDumpster: initialData.asbestosDumpster || false,
        dumpsterSwaps: initialData.dumpsterSwaps || initialData.directLoadOut || "",
        openDumpster: initialData.openDumpster || "",
        dumpsterPlacement: initialData.dumpsterPlacement || "",
        portableBathroom: initialData.portableBathroom || false,
        floringLayers: initialData.floringLayers || initialData.flooringLayers || "",
        dryWallLayers: initialData.dryWallLayers || initialData.drywallLayers || "",
        hvacRemoval: initialData.hvacRemoval || initialData.hvacDucting || "",
        acmDisturbed: initialData.acmDisturbed || initialData.spillQuantity || "",
        contentsRemove: initialData.contentsRemove || initialData.contentsRemoval || "",
        furnitureAppliances: initialData.furnitureAppliances || "",
        customerInformed: initialData.customerInformed || initialData.customerResponsible || "",
        fieldNotes: initialData.fieldNotes || "",
        laborSupervisor: {
          regularHours: initialData.supervisorHours ?? initialData.laborSupervisor?.regularHours ?? 0,
          otHours: initialData.supervisorOtHours ?? initialData.laborSupervisor?.otHours ?? 0,
        },
        laborTechnician: {
          regularHours: initialData.technicianHours ?? initialData.laborTechnician?.regularHours ?? 0,
          otHours: initialData.technicianOtHours ?? initialData.laborTechnician?.otHours ?? 0,
        },
        opsPerHourRate: initialData.opsPerHourRate ?? settingsOpsRate ?? DEFAULT_OPS_RATE,
        cogs: initialData.cogs?.length > 0
          ? initialData.cogs.map((c: any) => ({ item: c.item, qty: c.qty || 0, cost: c.cost || 0 }))
          : DEFAULT_COGS.map((item) => ({ item: item.item, qty: 0, cost: 0 })),
        materials: initialData.materials?.length > 0
          ? initialData.materials.map((m: any) => ({ name: m.name, qty: m.qty || 0, cost: m.cost || 0 }))
          : DEFAULT_MATERIALS.map((mat) => ({ name: mat.name, qty: 0, cost: 0 })),
        markupPercent: initialData.markupPercent ?? 15,
        customerPriceOverride: initialData.customerPriceOverride ?? null,
        serviceDescription: initialData.serviceDescription || "",
      };
    }
    return {
      customerName: lead?.firstName ? `${lead.firstName} ${lead.lastName}` : "",
      address: lead?.address || "",
      city: lead?.city || "",
      state: lead?.state || "CO",
      zip: lead?.zip || "",
      milesFromShop: 0,
      projectDate: new Date().toISOString().split("T")[0],
      siteVisitRequirements: [],
      scopeOfWork: lead?.description || lead?.notes || "",
      daysNeeded: 0,
      crewSize: 0,
      paymentType: "",
      typeOfLoss: "",
      septicSystem: false,
      vacateNeeded: "",
      driveTimeHours: 0,
      sufficientPower: false,
      goodWaterSource: false,
      difficultyRating: 3,
      wasteYards: 0,
      permitRequired: "",
      airClearances: "",
      projectDesign: "",
      deconLoadout: "",
      namsCount: 0,
      ductCleaning: "",
      dumpsterNeeded: false,
      asbestosDumpster: false,
      dumpsterSwaps: "",
      openDumpster: "",
      dumpsterPlacement: "",
      portableBathroom: false,
      floringLayers: "",
      dryWallLayers: "",
      hvacRemoval: "",
      acmDisturbed: "",
      contentsRemove: "",
      furnitureAppliances: "",
      customerInformed: "",
      fieldNotes: "",
      laborSupervisor: { regularHours: 0, otHours: 0 },
      laborTechnician: { regularHours: 0, otHours: 0 },
      opsPerHourRate: settingsOpsRate ?? DEFAULT_OPS_RATE,
      cogs: DEFAULT_COGS.map((item) => ({ item: item.item, qty: 0, cost: 0 })),
      materials: DEFAULT_MATERIALS.map((mat) => ({ name: mat.name, qty: 0, cost: 0 })),
      markupPercent: 15,
      customerPriceOverride: null,
      serviceDescription: "",
    };
  };

  const [formData, setFormData] = useState<ConsultationFormData>(buildInitialFormData);

  // Auto-markup: 15% base + 1% per difficulty rating
  useEffect(() => {
    const autoMarkup = 15 + formData.difficultyRating;
    setFormData((prev) => ({ ...prev, markupPercent: autoMarkup, customerPriceOverride: null }));
  }, [formData.difficultyRating]);

  // Auto-populate service description from scope of work
  useEffect(() => {
    if (formData.scopeOfWork) {
      setFormData((prev) => ({ ...prev, serviceDescription: formData.scopeOfWork }));
    }
  }, [formData.scopeOfWork]);

  // Auto-populate labor when consultation changes
  // Crew size INCLUDES the supervisor when permit is required.
  // e.g. crewSize=3 with permit → 1 supervisor + 2 technicians
  // Drive time is added per employee (each person drives the same hours)
  useEffect(() => {
    let supervisorRegularHours = 0;
    let technicianCount = formData.crewSize;

    if (formData.permitRequired === "Yes" && formData.crewSize > 0) {
      // Supervisor: work hours + their own drive time
      supervisorRegularHours = formData.daysNeeded * 8 + formData.driveTimeHours;
      technicianCount = Math.max(formData.crewSize - 1, 0); // subtract supervisor from crew
    }

    // Each technician gets work hours + their own drive time
    const techDriveTotal = technicianCount * formData.driveTimeHours;
    const technicianRegularHours = technicianCount * formData.daysNeeded * 8 + techDriveTotal;

    setFormData((prev) => ({
      ...prev,
      laborSupervisor: {
        ...prev.laborSupervisor,
        regularHours: supervisorRegularHours,
      },
      laborTechnician: {
        ...prev.laborTechnician,
        regularHours: technicianRegularHours,
      },
    }));
  }, [formData.crewSize, formData.daysNeeded, formData.permitRequired, formData.driveTimeHours]);

  // Auto-populate COGS when consultation changes
  useEffect(() => {
    // Pre-compute totals for referral fee calculation (excluding referral fee itself)
    const laborCostForRef =
      (formData.laborSupervisor.regularHours * rates.supervisorHourly +
        formData.laborSupervisor.regularHours * rates.supervisorTaxBurden +
        formData.laborSupervisor.otHours * rates.supervisorHourly * 1.5 +
        formData.laborSupervisor.otHours * rates.supervisorTaxBurden) +
      (formData.laborTechnician.regularHours * rates.technicianHourly +
        formData.laborTechnician.regularHours * rates.technicianTaxBurden +
        formData.laborTechnician.otHours * rates.technicianHourly * 1.5 +
        formData.laborTechnician.otHours * rates.technicianTaxBurden);
    const totalHoursForRef =
      formData.laborSupervisor.regularHours + formData.laborSupervisor.otHours +
      formData.laborTechnician.regularHours + formData.laborTechnician.otHours;
    const opsCostForRef = totalHoursForRef * formData.opsPerHourRate;
    const materialsCostForRef = formData.materials.reduce((s, m) => s + m.cost, 0);

    // First pass: calculate all COGS except Referral Fee
    const newCogs = formData.cogs.map((cog) => {
      const cogsItem = DEFAULT_COGS.find((item) => item.item === cog.item);
      if (!cogsItem || cog.item === "Referral Fee") return cog;

      let qty = 0;
      let cost = 0;

      switch (cog.item) {
        case "Waste":
          qty = formData.wasteYards;
          cost = formData.wasteYards * rates.wasteRatePerYard;
          break;

        case "Permit":
          if (formData.permitRequired === "Yes") {
            qty = 1;
            cost = rates.permitCost;
          }
          break;

        case "Clearance":
          if (formData.airClearances) {
            qty = 1;
            cost = rates.clearanceCost;
          }
          break;

        case "Per Diem 45+ Miles":
          if (formData.milesFromShop >= rates.perDiemMileThreshold) {
            // crewSize already includes supervisor when permit required
            qty = formData.crewSize * formData.daysNeeded;
            cost = qty * rates.perDiemRate;
          }
          break;

        case "Vehicle":
          qty = formData.daysNeeded;
          cost = formData.milesFromShop * 2 * rates.vehicleMileageRate * qty;
          break;

        case "Trailer":
          qty = rates.trailerDefaultQty;
          cost = formData.milesFromShop * 2 * rates.trailerMileageRate * qty;
          break;

        case "Project Design":
          if (formData.projectDesign) {
            qty = 1;
            // Try to parse as number, otherwise manual
            const parsed = parseFloat(formData.projectDesign);
            cost = !isNaN(parsed) ? parsed : 0;
          }
          break;
      }

      return { ...cog, qty, cost };
    });

    // Second pass: calculate Referral Fee using fresh COGS values
    const activeLead = selectedLead || lead;
    if (activeLead?.company?.referralFeeEnabled && activeLead.company.referralFeePercent) {
      const pct = activeLead.company.referralFeePercent;
      const cogsExclRef = newCogs
        .filter((c) => c.item !== "Referral Fee")
        .reduce((s, c) => s + c.cost, 0);
      const grandTotalExclRef = laborCostForRef + opsCostForRef + cogsExclRef + materialsCostForRef;
      const custPriceExclRef = formData.customerPriceOverride !== null
        ? formData.customerPriceOverride
        : grandTotalExclRef * (1 + formData.markupPercent / 100);
      const refIdx = newCogs.findIndex((c) => c.item === "Referral Fee");
      if (refIdx >= 0) {
        newCogs[refIdx] = { ...newCogs[refIdx], qty: pct, cost: Math.round(custPriceExclRef * pct / 100) };
      }
    }

    setFormData((prev) => ({
      ...prev,
      cogs: newCogs,
    }));
  }, [
    formData.wasteYards,
    formData.permitRequired,
    formData.airClearances,
    formData.milesFromShop,
    formData.crewSize,
    formData.daysNeeded,
    formData.projectDesign,
    formData.laborSupervisor,
    formData.laborTechnician,
    formData.opsPerHourRate,
    formData.materials,
    formData.markupPercent,
    formData.customerPriceOverride,
    rates,
    lead,
    selectedLead,
  ]);

  // Auto-populate materials when labor hours change
  useEffect(() => {
    const totalHours =
      formData.laborSupervisor.regularHours +
      formData.laborSupervisor.otHours +
      formData.laborTechnician.regularHours +
      formData.laborTechnician.otHours;

    // Calculate material subtotal before fuel
    let materialSubtotalBeforeFuel = 0;

    const newMaterials = formData.materials.map((mat) => {
      const matDefault = DEFAULT_MATERIALS.find((m) => m.name === mat.name);
      if (!matDefault) return mat;

      const qty = calcMaterialQty(
        matDefault,
        totalHours,
        formData.wasteYards,
        materialSubtotalBeforeFuel
      );

      if (mat.name === "Fuel Surcharge") {
        // Fuel surcharge is calculated as percentage of subtotal
        return { ...mat, qty: 0, cost: 0 }; // Will recalculate below
      }

      const cost = qty * matDefault.defaultPrice;
      materialSubtotalBeforeFuel += cost;

      return { ...mat, qty, cost };
    });

    // Calculate fuel surcharge using configured rate
    const fuelSurcharge = materialSubtotalBeforeFuel * (rates.fuelSurchargePercent / 100);
    const materialsWithFuel = newMaterials.map((mat) => {
      if (mat.name === "Fuel Surcharge") {
        return { ...mat, qty: 0, cost: fuelSurcharge };
      }
      return mat;
    });

    setFormData((prev) => ({
      ...prev,
      materials: materialsWithFuel,
    }));
  }, [
    formData.laborSupervisor.regularHours,
    formData.laborSupervisor.otHours,
    formData.laborTechnician.regularHours,
    formData.laborTechnician.otHours,
    formData.wasteYards,
    rates,
  ]);

  // Totals calculations
  const totals = useMemo(() => {
    const laborCost =
      (formData.laborSupervisor.regularHours * rates.supervisorHourly +
        formData.laborSupervisor.regularHours * rates.supervisorTaxBurden +
        formData.laborSupervisor.otHours * rates.supervisorHourly * 1.5 +
        formData.laborSupervisor.otHours * rates.supervisorTaxBurden) +
      (formData.laborTechnician.regularHours * rates.technicianHourly +
        formData.laborTechnician.regularHours * rates.technicianTaxBurden +
        formData.laborTechnician.otHours * rates.technicianHourly * 1.5 +
        formData.laborTechnician.otHours * rates.technicianTaxBurden);

    const opsHours =
      formData.laborSupervisor.regularHours + formData.laborSupervisor.otHours +
      formData.laborTechnician.regularHours + formData.laborTechnician.otHours;
    const opsCost = opsHours * formData.opsPerHourRate;
    const cogsCost = formData.cogs.reduce((sum, cog) => sum + cog.cost, 0);
    const materialsCost = formData.materials.reduce(
      (sum, mat) => sum + mat.cost,
      0
    );

    const grandTotal = laborCost + opsCost + cogsCost + materialsCost;
    const customerPrice = formData.customerPriceOverride !== null
      ? formData.customerPriceOverride
      : grandTotal * (1 + formData.markupPercent / 100);
    const effectiveMarkup = grandTotal > 0
      ? ((customerPrice - grandTotal) / grandTotal) * 100
      : formData.markupPercent;

    return {
      labor: laborCost,
      ops: opsCost,
      cogs: cogsCost,
      materials: materialsCost,
      grandTotal,
      customerPrice,
      effectiveMarkup: Math.round(effectiveMarkup * 10) / 10,
    };
  }, [formData.laborSupervisor, formData.laborTechnician, formData.opsPerHourRate, formData.cogs, formData.materials, formData.markupPercent, formData.customerPriceOverride, rates]);

  const totalHours = useMemo(() => {
    return (
      formData.laborSupervisor.regularHours +
      formData.laborSupervisor.otHours +
      formData.laborTechnician.regularHours +
      formData.laborTechnician.otHours
    );
  }, [formData.laborSupervisor, formData.laborTechnician]);

  const handleInputChange = useCallback(
    (field: string, value: any) => {
      setFormData((prev) => {
        const keys = field.split(".");
        if (keys.length === 1) {
          return { ...prev, [field]: value };
        }

        const newData = { ...prev } as any;
        let current: any = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newData;
      });
    },
    []
  );

  const [estimatingMiles, setEstimatingMiles] = useState(false);
  const handleEstimateMiles = useCallback(async () => {
    const { address, city, state, zip } = formData;
    if (!city && !address) return;

    // Build full address string for geocoding
    const fullAddress = [address, city, state || "CO", zip].filter(Boolean).join(", ");

    setEstimatingMiles(true);
    try {
      const res = await fetch(`/api/places/geocode?address=${encodeURIComponent(fullAddress)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          const miles = Math.round(
            haversineDistance(XTRACT_OFFICE.lat, XTRACT_OFFICE.lng, data.lat, data.lng)
          );
          handleInputChange("milesFromShop", miles);
          setEstimatingMiles(false);
          return;
        }
      }
    } catch {
      // Fall through to city lookup
    }

    // Fallback: use city lookup table
    if (city) {
      const estimated = estimateMilesToCity(city);
      handleInputChange("milesFromShop", estimated);
    }
    setEstimatingMiles(false);
  }, [formData.address, formData.city, formData.state, formData.zip, handleInputChange]);

  const handleSiteVisitCheckbox = useCallback(
    (requirement: string) => {
      setFormData((prev) => {
        const current = prev.siteVisitRequirements.includes(requirement);
        if (current) {
          return {
            ...prev,
            siteVisitRequirements: prev.siteVisitRequirements.filter(
              (r) => r !== requirement
            ),
          };
        } else {
          return {
            ...prev,
            siteVisitRequirements: [...prev.siteVisitRequirements, requirement],
          };
        }
      });
    },
    []
  );

  const handleCogsChange = useCallback(
    (index: number, field: "qty" | "cost", value: number) => {
      setFormData((prev) => {
        const newCogs = [...prev.cogs];
        newCogs[index] = { ...newCogs[index], [field]: value };
        return { ...prev, cogs: newCogs };
      });
    },
    []
  );

  const handleMaterialChange = useCallback(
    (index: number, field: "qty" | "cost", value: number) => {
      setFormData((prev) => {
        const newMaterials = [...prev.materials];
        newMaterials[index] = { ...newMaterials[index], [field]: value };
        return { ...prev, materials: newMaterials };
      });
    },
    []
  );

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        leadId: selectedLead?.id || lead?.id || null,
        companyId: selectedCompanyId || null,
        contactId: selectedContactId || null,
        supervisorHours: formData.laborSupervisor.regularHours,
        supervisorOtHours: formData.laborSupervisor.otHours,
        technicianHours: formData.laborTechnician.regularHours,
        technicianOtHours: formData.laborTechnician.otHours,
        wasteDescription: `${formData.wasteYards} cubic yards`,
        opsPerHourRate: formData.opsPerHourRate,
        opsCost: totals.ops,
        laborCost: totals.labor,
        cogsCost: totals.cogs,
        materialCost: totals.materials,
        totalCost: totals.grandTotal,
        markupPercent: formData.customerPriceOverride !== null ? totals.effectiveMarkup : formData.markupPercent,
        customerPriceOverride: formData.customerPriceOverride,
        serviceDescription: formData.serviceDescription,
        customerPrice: totals.customerPrice,
      };

      const url = isEditMode
        ? `/api/consultation-estimates/${editId}`
        : "/api/consultation-estimates";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save estimate");
      }

      if (isEditMode) {
        router.push(`/estimates/consultation/${editId}`);
      } else {
        router.push("/estimates");
      }
    } catch (error: any) {
      logger.error("Error saving estimate:", { error: String(error) });
      alert(error.message || "Failed to save estimate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const materialsToShow = showAllMaterials
    ? formData.materials
    : formData.materials.filter((mat) => mat.qty > 0);

  const STEP_LABELS = ["Site Info", "Field Consultation", "Labor", "Operating Costs", "COGS", "Materials", "Markup & Pricing"];

  const StepNav = ({ showBack, showNext, onBack, onNext, backLabel, nextLabel }: {
    showBack?: boolean;
    showNext?: boolean;
    onBack?: () => void;
    onNext?: () => void;
    backLabel?: string;
    nextLabel?: string;
  }) => (
    <div className="flex items-center justify-between gap-2 mb-4">
      <div>
        {showBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 md:min-h-[44px] bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
          >
            {backLabel || "Back"}
          </button>
        )}
      </div>
      <div className="flex gap-1">
        {STEP_LABELS.map((label, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentStep(idx + 1)}
            title={label}
            className={`w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
              currentStep === idx + 1
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
      <div>
        {showNext && (
          <button
            onClick={onNext}
            className="px-4 py-2 md:min-h-[44px] bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            {nextLabel || "Next"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex gap-4">
      {/* Main form */}
      <div className="flex-1 p-4 md:p-6 pb-24 lg:pb-6">
        {/* Step 1: Site Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <StepNav showNext onNext={() => setCurrentStep(2)} />
            <h2 className="text-2xl font-bold">Step 1: Site Information</h2>

            {/* Link to Lead / Company / Contact */}
            {!isEditMode && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Link to Lead or Company</h3>

                {/* Lead search */}
                <div ref={leadSearchRef} className="relative">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Lead</label>
                  {selectedLead ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg">
                      <span className="flex-1 text-sm text-slate-900">
                        {selectedLead.firstName} {selectedLead.lastName}
                        {selectedLead.company?.name && (
                          <span className="text-slate-500"> — {selectedLead.company.name}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearLead}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={leadSearch}
                          onChange={(e) => {
                            setLeadSearch(e.target.value);
                            setShowLeadDropdown(true);
                          }}
                          onFocus={() => setShowLeadDropdown(true)}
                          placeholder="Search leads by name, address, or company..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                        />
                      </div>
                      {showLeadDropdown && filteredLeads.length > 0 && (
                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredLeads.map((l) => (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => handleSelectLead(l)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                            >
                              <div className="text-sm font-medium text-slate-900">
                                {l.firstName} {l.lastName}
                              </div>
                              <div className="text-xs text-slate-500 flex gap-2">
                                {l.company?.name && <span>{l.company.name}</span>}
                                {l.address && <span>• {l.address}</span>}
                                {l.status && <span className="capitalize">• {l.status.replace("_", " ")}</span>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {showLeadDropdown && leadSearch.trim() && filteredLeads.length === 0 && (
                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm text-slate-500">
                          No leads found
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Company & Contact selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => {
                        setSelectedCompanyId(e.target.value);
                        setSelectedContactId("");
                        if (!selectedLead) {
                          // If no lead selected, just set company context
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                    >
                      <option value="">No company selected</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Contact</label>
                    <select
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                    >
                      <option value="">No contact selected</option>
                      {availableContacts.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    handleInputChange("customerName", e.target.value)
                  }
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Project Date
                </label>
                <input
                  type="date"
                  value={formData.projectDate}
                  onChange={(e) =>
                    handleInputChange("projectDate", e.target.value)
                  }
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Address
                </label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(val) => handleInputChange("address", val)}
                  onSelect={(result) => {
                    handleInputChange("address", result.address);
                    if (result.city) handleInputChange("city", result.city);
                    if (result.state) handleInputChange("state", result.state);
                    if (result.zip) handleInputChange("zip", result.zip);
                  }}
                  placeholder="Start typing an address..."
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Zip</label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => handleInputChange("zip", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <label className="block text-sm font-medium mb-2">
                Miles from Shop
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <input
                    type="number"
                    value={formData.milesFromShop}
                    onChange={(e) =>
                      handleInputChange("milesFromShop", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                  />
                </div>
                <button
                  onClick={handleEstimateMiles}
                  disabled={estimatingMiles}
                  className="px-4 py-2 md:min-h-[44px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
                >
                  <Calculator size={16} className={estimatingMiles ? "animate-spin" : ""} />
                  {estimatingMiles ? "Estimating..." : "Estimate Miles"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Auto-estimated from office (903 5th St, Greeley, CO)
              </p>
            </div>

            <StepNav showNext onNext={() => setCurrentStep(2)} />
          </div>
        )}

        {/* Step 2: Field Consultation */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <StepNav showBack showNext onBack={() => setCurrentStep(1)} onNext={() => setCurrentStep(3)} />
            <h2 className="text-2xl font-bold">Step 2: Field Consultation</h2>

            {/* Site Visit Requirements */}
            <div className="border p-4 rounded">
              <label className="block text-sm font-medium mb-4">
                Site Visit Requirements
              </label>
              <div className="space-y-2">
                {SITE_VISIT_REQUIREMENTS.map((req) => (
                  <label key={req} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.siteVisitRequirements.includes(req)}
                      onChange={() => handleSiteVisitCheckbox(req)}
                      className="w-4 h-4 md:min-h-[44px] md:w-5 md:h-5"
                    />
                    <span className="text-sm">{req}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Scope of Work
              </label>
              <textarea
                value={formData.scopeOfWork}
                onChange={(e) => handleInputChange("scopeOfWork", e.target.value)}
                className="w-full px-3 py-2 border rounded min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Days Needed
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.daysNeeded}
                  onChange={(e) =>
                    handleInputChange("daysNeeded", parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Crew Size
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.crewSize}
                  onChange={(e) =>
                    handleInputChange("crewSize", parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Payment Type
                </label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => handleInputChange("paymentType", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                >
                  <option value="">Select...</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Self Pay">Self Pay</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Type of Loss
                </label>
                <input
                  type="text"
                  value={formData.typeOfLoss}
                  onChange={(e) => handleInputChange("typeOfLoss", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Drive Time Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.driveTimeHours}
                  onChange={(e) =>
                    handleInputChange("driveTimeHours", parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Vacate Property
                </label>
                <select
                  value={formData.vacateNeeded}
                  onChange={(e) => handleInputChange("vacateNeeded", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                >
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.septicSystem}
                  onChange={(e) => handleInputChange("septicSystem", e.target.checked)}
                  className="w-4 h-4 md:w-5 md:h-5"
                />
                <span className="text-sm">Septic System</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.sufficientPower}
                  onChange={(e) => handleInputChange("sufficientPower", e.target.checked)}
                  className="w-4 h-4 md:w-5 md:h-5"
                />
                <span className="text-sm">Power Available</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.goodWaterSource}
                  onChange={(e) =>
                    handleInputChange("goodWaterSource", e.target.checked)
                  }
                  className="w-4 h-4 md:w-5 md:h-5"
                />
                <span className="text-sm">Water Source</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Difficulty Rating (1-5)
                </label>
                <select
                  value={formData.difficultyRating}
                  onChange={(e) =>
                    handleInputChange("difficultyRating", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                >
                  <option value={1}>1 - Easy</option>
                  <option value={2}>2</option>
                  <option value={3}>3 - Medium</option>
                  <option value={4}>4</option>
                  <option value={5}>5 - Very Difficult</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Estimated Waste (Cubic Yards)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.wasteYards}
                  onChange={(e) =>
                    handleInputChange("wasteYards", parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Permit Required
                </label>
                <select
                  value={formData.permitRequired}
                  onChange={(e) => handleInputChange("permitRequired", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                >
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="TBD">TBD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Air Clearances
                </label>
                <input
                  type="text"
                  value={formData.airClearances}
                  onChange={(e) => handleInputChange("airClearances", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Project Design
                </label>
                <input
                  type="text"
                  value={formData.projectDesign}
                  onChange={(e) => handleInputChange("projectDesign", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Decon/Loadout Location
                </label>
                <input
                  type="text"
                  value={formData.deconLoadout}
                  onChange={(e) => handleInputChange("deconLoadout", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  NAMs Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.namsCount}
                  onChange={(e) =>
                    handleInputChange("namsCount", parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Duct Cleaning Eligibility
                </label>
                <input
                  type="text"
                  value={formData.ductCleaning}
                  onChange={(e) => handleInputChange("ductCleaning", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>
            </div>

            {/* Dumpster Section - Only show if dumpsterNeeded is true */}
            <div className="border p-4 rounded">
              <label className="block text-sm font-medium mb-4">
                Dumpster Needed?
              </label>
              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={formData.dumpsterNeeded}
                  onChange={(e) => handleInputChange("dumpsterNeeded", e.target.checked)}
                  className="w-4 h-4 md:w-5 md:h-5"
                />
                <span className="text-sm">Yes, dumpster needed</span>
              </label>

              {formData.dumpsterNeeded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.asbestosDumpster}
                      onChange={(e) =>
                        handleInputChange("asbestosDumpster", e.target.checked)
                      }
                      className="w-4 h-4 md:w-5 md:h-5"
                    />
                    <span className="text-sm">Asbestos Dumpster</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Dumpster Swaps
                    </label>
                    <input
                      type="text"
                      value={formData.dumpsterSwaps}
                      onChange={(e) =>
                        handleInputChange("dumpsterSwaps", e.target.value)
                      }
                      className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Open Dumpster
                    </label>
                    <input
                      type="text"
                      value={formData.openDumpster}
                      onChange={(e) =>
                        handleInputChange("openDumpster", e.target.value)
                      }
                      className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Dumpster Placement
                    </label>
                    <input
                      type="text"
                      value={formData.dumpsterPlacement}
                      onChange={(e) =>
                        handleInputChange("dumpsterPlacement", e.target.value)
                      }
                      className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.portableBathroom}
                  onChange={(e) =>
                    handleInputChange("portableBathroom", e.target.checked)
                  }
                  className="w-4 h-4 md:w-5 md:h-5"
                />
                <span className="text-sm">Portable Bathroom</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Flooring Layers
                </label>
                <input
                  type="text"
                  value={formData.floringLayers}
                  onChange={(e) => handleInputChange("floringLayers", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Drywall Layers
                </label>
                <input
                  type="text"
                  value={formData.dryWallLayers}
                  onChange={(e) => handleInputChange("dryWallLayers", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  HVAC/Ducting
                </label>
                <input
                  type="text"
                  value={formData.hvacRemoval}
                  onChange={(e) => handleInputChange("hvacRemoval", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Spill/ACM Quantity
                </label>
                <input
                  type="text"
                  value={formData.acmDisturbed}
                  onChange={(e) => handleInputChange("acmDisturbed", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Contents Removal
                </label>
                <input
                  type="text"
                  value={formData.contentsRemove}
                  onChange={(e) => handleInputChange("contentsRemove", e.target.value)}
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Furniture/Appliances
                </label>
                <input
                  type="text"
                  value={formData.furnitureAppliances}
                  onChange={(e) =>
                    handleInputChange("furnitureAppliances", e.target.value)
                  }
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-sm font-medium mb-2">
                  Customer Responsibilities
                </label>
                <input
                  type="text"
                  value={formData.customerInformed}
                  onChange={(e) =>
                    handleInputChange("customerInformed", e.target.value)
                  }
                  className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Field Notes
              </label>
              <textarea
                value={formData.fieldNotes}
                onChange={(e) => handleInputChange("fieldNotes", e.target.value)}
                className="w-full px-3 py-2 border rounded min-h-[100px]"
              />
            </div>

            <StepNav showBack showNext onBack={() => setCurrentStep(1)} onNext={() => setCurrentStep(3)} />
          </div>
        )}

        {/* Step 3: Labor */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <StepNav showBack showNext onBack={() => setCurrentStep(2)} onNext={() => setCurrentStep(4)} />
            <h2 className="text-2xl font-bold">Step 3: Labor</h2>


            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <p className="text-sm">
                Hours auto-populated from consultation: {formData.crewSize} crew ×{" "}
                {formData.daysNeeded} days × 8 hrs/day
                {formData.permitRequired === "Yes" && ` (1 supervisor + ${Math.max(formData.crewSize - 1, 0)} techs)`}
                {formData.driveTimeHours > 0 && (
                  <span className="block mt-1 text-blue-700">
                    + {formData.driveTimeHours} hrs drive time × {formData.crewSize} employees = {formData.driveTimeHours * formData.crewSize} hrs added to labor
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Supervisor */}
              <div className="border p-4 rounded">
                <h3 className="font-semibold mb-4">Supervisor</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Regular Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.laborSupervisor.regularHours}
                      onChange={(e) =>
                        handleInputChange(
                          "laborSupervisor.regularHours",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Overtime Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.laborSupervisor.otHours}
                      onChange={(e) =>
                        handleInputChange(
                          "laborSupervisor.otHours",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                    />
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-600">Hourly: ${rates.supervisorHourly}</p>
                    <p className="text-gray-600">
                      Tax Burden: ${rates.supervisorTaxBurden}
                    </p>
                    <p className="font-semibold mt-2">
                      Subtotal:{" "}
                      {formatCurrency(
                        formData.laborSupervisor.regularHours *
                          rates.supervisorHourly +
                          formData.laborSupervisor.regularHours *
                            rates.supervisorTaxBurden +
                          formData.laborSupervisor.otHours *
                            rates.supervisorHourly *
                            1.5 +
                          formData.laborSupervisor.otHours *
                            rates.supervisorTaxBurden
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Technician */}
              <div className="border p-4 rounded">
                <h3 className="font-semibold mb-4">Technician</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Regular Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.laborTechnician.regularHours}
                      onChange={(e) =>
                        handleInputChange(
                          "laborTechnician.regularHours",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Overtime Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.laborTechnician.otHours}
                      onChange={(e) =>
                        handleInputChange(
                          "laborTechnician.otHours",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 md:min-h-[44px] border rounded"
                    />
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-600">Hourly: ${rates.technicianHourly}</p>
                    <p className="text-gray-600">
                      Tax Burden: ${rates.technicianTaxBurden}
                    </p>
                    <p className="font-semibold mt-2">
                      Subtotal:{" "}
                      {formatCurrency(
                        formData.laborTechnician.regularHours *
                          rates.technicianHourly +
                          formData.laborTechnician.regularHours *
                            rates.technicianTaxBurden +
                          formData.laborTechnician.otHours *
                            rates.technicianHourly *
                            1.5 +
                          formData.laborTechnician.otHours *
                            rates.technicianTaxBurden
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <StepNav showBack showNext onBack={() => setCurrentStep(2)} onNext={() => setCurrentStep(4)} />
          </div>
        )}

        {/* Step 4: Operating Costs */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <StepNav showBack showNext onBack={() => setCurrentStep(3)} onNext={() => setCurrentStep(5)} />
            <h2 className="text-2xl font-bold">Step 4: Operating Costs</h2>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <p className="text-sm">
                Operating cost rate is set in <strong>Pricing Settings</strong> (COGS tab). It is multiplied by total labor hours ({totalHours.toFixed(1)} hrs) to calculate operating costs.
              </p>
            </div>

            <div className="bg-white border rounded-lg p-6 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">Operating Cost per Hour</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={formData.opsPerHourRate}
                    readOnly
                    className="w-32 pl-7 pr-3 py-2.5 border rounded-lg text-right text-lg font-medium bg-gray-50 text-gray-600 cursor-not-allowed outline-none"
                  />
                </div>
                <span className="text-sm text-gray-500">/ hour</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">Adjust this rate in Pricing Settings → COGS tab</p>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm text-gray-600">{totalHours.toFixed(1)} hours x {formatCurrency(formData.opsPerHourRate)}/hr</span>
                <span className="text-lg font-bold">{formatCurrency(totals.ops)}</span>
              </div>
            </div>

            <StepNav showBack showNext onBack={() => setCurrentStep(3)} onNext={() => setCurrentStep(5)} />
          </div>
        )}

        {/* Step 5: COGS */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <StepNav showBack showNext onBack={() => setCurrentStep(4)} onNext={() => setCurrentStep(6)} />
            <h2 className="text-2xl font-bold">Step 5: Cost of Goods Sold (COGS)</h2>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <p className="text-sm">
                Auto-populated from consultation. Review and adjust as needed.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">Item</th>
                    <th className="text-right p-2 font-semibold">Qty</th>
                    <th className="text-right p-2 font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.cogs.map((cog, index) => {
                    const notes = DEFAULT_COGS.find(
                      (item) => item.item === cog.item
                    )?.notes;
                    return (
                      <tr key={index} className="border-b">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{cog.item}</p>
                            {notes && (
                              <p className="text-xs text-gray-500 mt-1">{notes}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={cog.qty}
                            onChange={(e) =>
                              handleCogsChange(
                                index,
                                "qty",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-right md:min-h-[44px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cog.cost}
                            onChange={(e) =>
                              handleCogsChange(
                                index,
                                "cost",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-right md:min-h-[44px]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold border-t-2">
                    <td className="p-2">COGS Total</td>
                    <td></td>
                    <td className="p-2 text-right">{formatCurrency(totals.cogs)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <StepNav showBack showNext onBack={() => setCurrentStep(4)} onNext={() => setCurrentStep(6)} />
          </div>
        )}

        {/* Step 6: Materials */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <StepNav showBack showNext onBack={() => setCurrentStep(5)} onNext={() => setCurrentStep(7)} />
            <h2 className="text-2xl font-bold">Step 6: Materials</h2>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <p className="text-sm">
                Material quantities auto-calculated from {totalHours} total labor hours
              </p>
            </div>

            {materialsToShow.length < formData.materials.length && (
              <button
                onClick={() => setShowAllMaterials(true)}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <ChevronDown size={16} />
                Show All Materials ({formData.materials.length - materialsToShow.length} hidden)
              </button>
            )}

            {showAllMaterials && formData.materials.some((m) => m.qty === 0) && (
              <button
                onClick={() => setShowAllMaterials(false)}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <ChevronUp size={16} />
                Hide zero-qty materials
              </button>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">Material</th>
                    <th className="text-center p-2 font-semibold">Unit</th>
                    <th className="text-right p-2 font-semibold">Qty</th>
                    <th className="text-right p-2 font-semibold">Unit Price</th>
                    <th className="text-right p-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {materialsToShow.map((mat, index) => {
                    const matDefault = DEFAULT_MATERIALS.find(
                      (m) => m.name === mat.name
                    );
                    const isFuelSurcharge = mat.name === "Fuel Surcharge";

                    return (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{mat.name}</td>
                        <td className="p-2 text-center text-xs">
                          {matDefault?.unit}
                        </td>
                        {isFuelSurcharge ? (
                          <>
                            <td className="p-2 text-right text-gray-500">
                              (calculated)
                            </td>
                            <td className="p-2 text-right text-gray-500">2.56%</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={mat.qty}
                                onChange={(e) =>
                                  handleMaterialChange(
                                    index,
                                    "qty",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full px-2 py-1 border rounded text-right md:min-h-[44px]"
                              />
                            </td>
                            <td className="p-2 text-right">
                              {formatCurrency(matDefault?.defaultPrice || 0)}
                            </td>
                          </>
                        )}
                        <td className="p-2 text-right font-semibold">
                          {formatCurrency(mat.cost)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold border-t-2">
                    <td colSpan={4} className="p-2">
                      Materials Total
                    </td>
                    <td className="p-2 text-right">{formatCurrency(totals.materials)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <StepNav showBack showNext onBack={() => setCurrentStep(5)} onNext={() => setCurrentStep(7)} />
          </div>
        )}

        {/* Step 7: Markup & Customer Price */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <StepNav showBack onBack={() => setCurrentStep(6)} />

            <h2 className="text-2xl font-bold">Step 7: Markup & Customer Price</h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              Auto-markup is calculated as 15% base + 1% per difficulty rating (current difficulty: {formData.difficultyRating}/5).
              You can adjust the markup percentage or override the customer price directly.
            </div>

            {/* Cost Summary */}
            <div className="border rounded-lg p-6 bg-white space-y-3">
              <h3 className="font-semibold text-lg mb-4">Internal Cost Breakdown</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Labor</span>
                <span className="font-medium">{formatCurrency(totals.labor)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Operating Costs</span>
                <span className="font-medium">{formatCurrency(totals.ops)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">COGS</span>
                <span className="font-medium">{formatCurrency(totals.cogs)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Materials</span>
                <span className="font-medium">{formatCurrency(totals.materials)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-bold">Internal Cost Total</span>
                <span className="font-bold text-lg">{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>

            {/* Markup Controls */}
            <div className="border rounded-lg p-6 bg-white space-y-4">
              <h3 className="font-semibold text-lg">Markup</h3>

              <div>
                <label className="block text-sm font-medium mb-2">Markup Percentage</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.customerPriceOverride !== null ? totals.effectiveMarkup : formData.markupPercent}
                    onChange={(e) => setFormData((prev) => ({ ...prev, markupPercent: parseFloat(e.target.value), customerPriceOverride: null }))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="200"
                      step="1"
                      value={formData.customerPriceOverride !== null ? totals.effectiveMarkup : formData.markupPercent}
                      onChange={(e) => setFormData((prev) => ({ ...prev, markupPercent: parseFloat(e.target.value) || 0, customerPriceOverride: null }))}
                      className="w-20 px-3 py-2 border rounded text-right md:min-h-[44px]"
                    />
                    <span className="text-sm font-medium">%</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {[15, 16, 17, 18, 19, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, markupPercent: pct, customerPriceOverride: null }))}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        formData.customerPriceOverride === null && formData.markupPercent === pct
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Service Description (for customer)</label>
                <textarea
                  value={formData.serviceDescription}
                  onChange={(e) => handleInputChange("serviceDescription", e.target.value)}
                  placeholder="Description of services to appear on the customer-facing estimate or invoice..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            {/* Customer Price */}
            <div className={`border-2 rounded-lg p-6 space-y-3 ${formData.customerPriceOverride !== null ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"}`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold text-lg ${formData.customerPriceOverride !== null ? "text-amber-900" : "text-green-900"}`}>Customer Price</h3>
                {formData.customerPriceOverride !== null && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, customerPriceOverride: null }))}
                    className="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded hover:bg-amber-300 transition"
                  >
                    Reset to Auto
                  </button>
                )}
              </div>
              <div className="flex justify-between text-sm">
                <span className={formData.customerPriceOverride !== null ? "text-amber-800" : "text-green-800"}>Internal Cost</span>
                <span className="font-medium">{formatCurrency(totals.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={formData.customerPriceOverride !== null ? "text-amber-800" : "text-green-800"}>Markup ({totals.effectiveMarkup}%)</span>
                <span className="font-medium">
                  {formatCurrency(totals.customerPrice - totals.grandTotal)}
                </span>
              </div>
              <div className={`border-t pt-3 ${formData.customerPriceOverride !== null ? "border-amber-300" : "border-green-300"}`}>
                <label className={`block text-sm font-medium mb-1 ${formData.customerPriceOverride !== null ? "text-amber-900" : "text-green-900"}`}>
                  {formData.customerPriceOverride !== null ? "Customer Price (Override)" : "Customer Price"}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.customerPriceOverride !== null ? formData.customerPriceOverride : Math.round(totals.customerPrice * 100) / 100}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        setFormData((prev) => ({ ...prev, customerPriceOverride: val }));
                      }
                    }}
                    className="flex-1 px-3 py-2 border rounded text-right text-2xl font-bold md:min-h-[44px]"
                  />
                </div>
                {formData.customerPriceOverride !== null && (
                  <p className="text-xs text-amber-700 mt-1">
                    Manual override active — markup auto-adjusted to {totals.effectiveMarkup}%
                  </p>
                )}
              </div>
              <div className={`text-xs mt-2 ${formData.customerPriceOverride !== null ? "text-amber-700" : "text-green-700"}`}>
                Profit: {formatCurrency(totals.customerPrice - totals.grandTotal)} ({totals.effectiveMarkup}% margin)
              </div>
            </div>

            {/* Bottom nav */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setCurrentStep(6)}
                className="px-4 py-2 md:min-h-[44px] bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Back
              </button>
              <div className="flex gap-1">
                {STEP_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx + 1)}
                    title={label}
                    className={`w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
                      currentStep === idx + 1
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-4 py-2 md:min-h-[44px] bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? "Saving..." : isEditMode ? "Update Estimate" : "Save Estimate"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Sidebar (Desktop only) */}
      <div className="hidden lg:block w-80 p-6 bg-gray-50 border-l sticky top-0 h-screen overflow-y-auto">
        <h3 className="text-lg font-semibold mb-6">Estimate Summary</h3>

        <div className="space-y-4">
          <div className="border-b pb-4">
            <p className="text-sm text-gray-600">Labor</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.labor)}</p>
          </div>

          <div className="border-b pb-4">
            <p className="text-sm text-gray-600">Operating Costs</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.ops)}</p>
          </div>

          <div className="border-b pb-4">
            <p className="text-sm text-gray-600">COGS</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.cogs)}</p>
          </div>

          <div className="border-b pb-4">
            <p className="text-sm text-gray-600">Materials</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.materials)}</p>
          </div>

          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-gray-600 mb-2">Internal Cost</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(totals.grandTotal)}
            </p>
          </div>

          <div className={`p-4 rounded ${formData.customerPriceOverride !== null ? "bg-amber-50" : "bg-green-50"}`}>
            <p className="text-sm text-gray-600 mb-1">
              Customer Price ({totals.effectiveMarkup}% markup)
              {formData.customerPriceOverride !== null && <span className="text-amber-600 ml-1">⚡ Override</span>}
            </p>
            <p className={`text-3xl font-bold ${formData.customerPriceOverride !== null ? "text-amber-600" : "text-green-600"}`}>
              {formatCurrency(totals.customerPrice)}
            </p>
          </div>

          <div className="text-xs text-gray-500 space-y-2 mt-6">
            <p>Step: {currentStep} of 7</p>
            <p>Total Hours: {totalHours.toFixed(1)}</p>
            <p>Crew: {formData.crewSize}</p>
            <p>Days: {formData.daysNeeded}</p>
            <p>Miles: {formData.milesFromShop}</p>
          </div>
        </div>
      </div>

      {/* Mobile Summary Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-50 border-t p-4 flex gap-2 z-40">
        <div className="flex-1">
          <p className="text-xs text-gray-600">Total</p>
          <p className="font-bold">{formatCurrency(totals.grandTotal)}</p>
        </div>
        <div className="flex-1 text-right">
          <p className="text-xs text-gray-600">Step {currentStep}/7</p>
          <p className="text-sm">Labor: {formatCurrency(totals.labor)}</p>
        </div>
      </div>
    </div>
  );
}
