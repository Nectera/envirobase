"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  LABOR_RATES,
  DEFAULT_COGS,
  DEFAULT_MATERIALS,
  DEFAULT_OPS_RATE,
  SITE_VISIT_REQUIREMENTS,
  calcMaterialQty,
  calcFuelSurcharge,
  DEFAULT_COGS_RATES,
  type COGSRates,
} from "@/lib/materials";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Loader2,
  Save,
  Calculator,
} from "lucide-react";

/* ─── Types ─── */
interface ChangeOrderEstimateData {
  // Step 1: Change Info
  title: string;
  description: string;
  reason: string;
  daysImpact: number;

  // Step 2: Site / Field Checklist
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
  laborSupervisor: { regularHours: number; otHours: number };
  laborTechnician: { regularHours: number; otHours: number };

  // Step 4: Operating Costs
  opsPerHourRate: number;

  // Step 5: COGS
  cogs: Array<{ item: string; qty: number; cost: number }>;

  // Step 6: Materials
  materials: Array<{ name: string; qty: number; cost: number }>;

  // Step 7: Markup & Pricing
  markupPercent: number;
  customerPriceOverride: number | null;
  serviceDescription: string;
}

interface ChangeOrderFormProps {
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onCreated: (co: any) => void;
  cogsRates?: Partial<COGSRates>;
  settingsOpsRate?: number;
}

const STEPS = [
  "Change Info",
  "Field Checklist",
  "Labor",
  "Operating Costs",
  "COGS",
  "Materials",
  "Markup & Pricing",
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ChangeOrderForm({
  projectId,
  projectName,
  onClose,
  onCreated,
  cogsRates: propCogsRates,
  settingsOpsRate,
}: ChangeOrderFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const manualMaterialEdits = useRef<Set<number>>(new Set());
  const manualCogsEdits = useRef<Set<number>>(new Set());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rates = useMemo(() => ({ ...DEFAULT_COGS_RATES, ...propCogsRates }), [JSON.stringify(propCogsRates)]);

  const buildInitialFormData = (): ChangeOrderEstimateData => ({
    title: "",
    description: "",
    reason: "",
    daysImpact: 0,
    siteVisitRequirements: [],
    scopeOfWork: "",
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
  });

  const [formData, setFormData] = useState<ChangeOrderEstimateData>(buildInitialFormData);

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
  useEffect(() => {
    let supervisorRegularHours = 0;
    let technicianCount = formData.crewSize;

    if (formData.permitRequired === "Yes" && formData.crewSize > 0) {
      supervisorRegularHours = formData.daysNeeded * 8 + formData.driveTimeHours;
      technicianCount = Math.max(formData.crewSize - 1, 0);
    }

    const techDriveTotal = technicianCount * formData.driveTimeHours;
    const technicianRegularHours = technicianCount * formData.daysNeeded * 8 + techDriveTotal;

    setFormData((prev) => ({
      ...prev,
      laborSupervisor: { ...prev.laborSupervisor, regularHours: supervisorRegularHours },
      laborTechnician: { ...prev.laborTechnician, regularHours: technicianRegularHours },
    }));
  }, [formData.crewSize, formData.daysNeeded, formData.permitRequired, formData.driveTimeHours]);

  // Auto-populate COGS when consultation changes
  useEffect(() => {
    const newCogs = formData.cogs.map((cog, index) => {
      const cogsItem = DEFAULT_COGS.find((item) => item.item === cog.item);
      if (!cogsItem || cog.item === "Referral Fee") return cog;
      if (manualCogsEdits.current.has(index)) return cog;

      let qty = 0;
      let cost = 0;

      switch (cog.item) {
        case "Waste":
          qty = formData.wasteYards;
          cost = formData.wasteYards * rates.wasteRatePerYard;
          break;
        case "Permit":
          if (formData.permitRequired === "Yes") { qty = 1; cost = rates.permitCost; }
          break;
        case "Clearance":
          if (formData.airClearances) { qty = 1; cost = rates.clearanceCost; }
          break;
        case "Per Diem 45+ Miles":
          // Note: for change orders, milesFromShop comes from the project — simplified to 0
          break;
        case "Vehicle":
          qty = formData.daysNeeded;
          cost = 0; // No miles tracked on CO — user enters manually
          break;
        case "Trailer":
          qty = rates.trailerDefaultQty;
          cost = 0;
          break;
        case "Project Design":
          if (formData.projectDesign) {
            qty = 1;
            const parsed = parseFloat(formData.projectDesign);
            cost = !isNaN(parsed) ? parsed : 0;
          }
          break;
      }

      return { ...cog, qty, cost };
    });

    setFormData((prev) => ({ ...prev, cogs: newCogs }));
  }, [
    formData.wasteYards, formData.permitRequired, formData.airClearances,
    formData.crewSize, formData.daysNeeded, formData.projectDesign,
    formData.laborSupervisor, formData.laborTechnician,
    formData.opsPerHourRate, formData.materials,
    formData.markupPercent, formData.customerPriceOverride, rates,
  ]);

  // Auto-populate materials when labor hours change
  useEffect(() => {
    const totalHours =
      formData.laborSupervisor.regularHours + formData.laborSupervisor.otHours +
      formData.laborTechnician.regularHours + formData.laborTechnician.otHours;

    let materialSubtotalBeforeFuel = 0;

    const newMaterials = formData.materials.map((mat, index) => {
      const matDefault = DEFAULT_MATERIALS.find((m) => m.name === mat.name);
      if (!matDefault) return mat;
      if (manualMaterialEdits.current.has(index)) {
        materialSubtotalBeforeFuel += mat.cost;
        return mat;
      }
      if (mat.name === "Fuel Surcharge") return { ...mat, qty: 0, cost: 0 };

      const qty = calcMaterialQty(matDefault, totalHours, formData.wasteYards, materialSubtotalBeforeFuel);
      const cost = qty * matDefault.defaultPrice;
      materialSubtotalBeforeFuel += cost;
      return { ...mat, qty, cost };
    });

    const fuelSurcharge = materialSubtotalBeforeFuel * (rates.fuelSurchargePercent / 100);
    const materialsWithFuel = newMaterials.map((mat) =>
      mat.name === "Fuel Surcharge" ? { ...mat, qty: 0, cost: fuelSurcharge } : mat
    );

    setFormData((prev) => ({ ...prev, materials: materialsWithFuel }));
  }, [
    formData.laborSupervisor.regularHours, formData.laborSupervisor.otHours,
    formData.laborTechnician.regularHours, formData.laborTechnician.otHours,
    formData.wasteYards, rates,
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
    const materialsCost = formData.materials.reduce((sum, mat) => sum + mat.cost, 0);

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
      formData.laborSupervisor.regularHours + formData.laborSupervisor.otHours +
      formData.laborTechnician.regularHours + formData.laborTechnician.otHours
    );
  }, [formData.laborSupervisor, formData.laborTechnician]);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => {
      const keys = field.split(".");
      if (keys.length === 1) return { ...prev, [field]: value };
      if (keys.length === 2) {
        return { ...prev, [keys[0]]: { ...(prev as any)[keys[0]], [keys[1]]: value } };
      }
      return prev;
    });
  }, []);

  const handleCogsChange = useCallback((index: number, field: "qty" | "cost", value: number) => {
    manualCogsEdits.current.add(index);
    setFormData((prev) => {
      const newCogs = [...prev.cogs];
      newCogs[index] = { ...newCogs[index], [field]: value };
      return { ...prev, cogs: newCogs };
    });
  }, []);

  const handleMaterialChange = useCallback((index: number, field: "qty" | "cost", value: number) => {
    manualMaterialEdits.current.add(index);
    setFormData((prev) => {
      const newMats = [...prev.materials];
      newMats[index] = { ...newMats[index], [field]: value };
      return { ...prev, materials: newMats };
    });
  }, []);

  const handleToggleRequirement = useCallback((req: string) => {
    setFormData((prev) => ({
      ...prev,
      siteVisitRequirements: prev.siteVisitRequirements.includes(req)
        ? prev.siteVisitRequirements.filter((r) => r !== req)
        : [...prev.siteVisitRequirements, req],
    }));
  }, []);

  async function handleSubmit() {
    if (!formData.title.trim() || !formData.description.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/change-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: formData.title,
          description: formData.description,
          reason: formData.reason || null,
          costImpact: totals.customerPrice,
          daysImpact: formData.daysImpact,
          estimateData: formData,
          laborCost: totals.labor,
          cogsCost: totals.cogs,
          materialCost: totals.materials,
          opsCost: totals.ops,
          totalCost: totals.grandTotal,
          customerPrice: totals.customerPrice,
        }),
      });
      if (res.ok) {
        const newCo = await res.json();
        onCreated(newCo);
        onClose();
      }
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }

  /* ─── Shared field helpers ─── */
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";
  const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const selectCls = inputCls;

  /* ─── Step Renderers ─── */

  function renderStep1() {
    return (
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Title *</label>
          <input type="text" value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Brief title for the change" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Description *</label>
          <textarea value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Detailed description of the change and its justification..." rows={4} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Reason</label>
            <select value={formData.reason} onChange={(e) => handleInputChange("reason", e.target.value)} className={selectCls}>
              <option value="">Select reason...</option>
              <option value="scope_change">Scope Change</option>
              <option value="unforeseen_conditions">Unforeseen Conditions</option>
              <option value="client_request">Client Request</option>
              <option value="regulatory">Regulatory Requirement</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Timeline Impact (days)</label>
            <input type="number" value={formData.daysImpact || ""} onChange={(e) => handleInputChange("daysImpact", parseInt(e.target.value) || 0)}
              placeholder="0" className={inputCls} />
            <p className="text-[10px] text-slate-400 mt-0.5">Positive = extends, negative = shortens</p>
          </div>
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-4">
        {/* Site Visit Requirements */}
        <div>
          <label className={labelCls}>Site Visit Requirements</label>
          <div className="grid grid-cols-1 gap-1.5 mt-1">
            {SITE_VISIT_REQUIREMENTS.map((req) => (
              <label key={req} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formData.siteVisitRequirements.includes(req)}
                  onChange={() => handleToggleRequirement(req)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                {req}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Scope of Work</label>
          <textarea value={formData.scopeOfWork} onChange={(e) => handleInputChange("scopeOfWork", e.target.value)}
            rows={3} placeholder="Describe the scope of work for this change..." className={inputCls} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Days Needed</label>
            <input type="number" value={formData.daysNeeded || ""} onChange={(e) => handleInputChange("daysNeeded", parseInt(e.target.value) || 0)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Crew Size</label>
            <input type="number" value={formData.crewSize || ""} onChange={(e) => handleInputChange("crewSize", parseInt(e.target.value) || 0)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Drive Time (hrs)</label>
            <input type="number" step="0.5" value={formData.driveTimeHours || ""} onChange={(e) => handleInputChange("driveTimeHours", parseFloat(e.target.value) || 0)}
              className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Payment Type</label>
            <select value={formData.paymentType} onChange={(e) => handleInputChange("paymentType", e.target.value)} className={selectCls}>
              <option value="">Select...</option>
              <option value="self_pay">Self Pay</option>
              <option value="insurance">Insurance</option>
              <option value="commercial">Commercial</option>
              <option value="government">Government</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Type of Loss</label>
            <select value={formData.typeOfLoss} onChange={(e) => handleInputChange("typeOfLoss", e.target.value)} className={selectCls}>
              <option value="">Select...</option>
              <option value="fire">Fire</option>
              <option value="water">Water</option>
              <option value="mold">Mold</option>
              <option value="asbestos">Asbestos</option>
              <option value="lead">Lead</option>
              <option value="biohazard">Biohazard</option>
              <option value="renovation">Renovation</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Permit Required</label>
            <select value={formData.permitRequired} onChange={(e) => handleInputChange("permitRequired", e.target.value)} className={selectCls}>
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="TBD">TBD</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Air Clearances</label>
            <select value={formData.airClearances} onChange={(e) => handleInputChange("airClearances", e.target.value)} className={selectCls}>
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="TBD">TBD</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Difficulty (1-5)</label>
            <select value={formData.difficultyRating} onChange={(e) => handleInputChange("difficultyRating", parseInt(e.target.value))} className={selectCls}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Waste (cubic yds)</label>
            <input type="number" step="0.5" value={formData.wasteYards || ""} onChange={(e) => handleInputChange("wasteYards", parseFloat(e.target.value) || 0)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>NAMS Count</label>
            <input type="number" value={formData.namsCount || ""} onChange={(e) => handleInputChange("namsCount", parseInt(e.target.value) || 0)}
              className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Project Design</label>
          <input type="text" value={formData.projectDesign} onChange={(e) => handleInputChange("projectDesign", e.target.value)}
            placeholder="Design description or cost amount" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Decon / Loadout Location</label>
          <input type="text" value={formData.deconLoadout} onChange={(e) => handleInputChange("deconLoadout", e.target.value)} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Duct Cleaning</label>
            <select value={formData.ductCleaning} onChange={(e) => handleInputChange("ductCleaning", e.target.value)} className={selectCls}>
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="TBD">TBD</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Vacate Property</label>
            <select value={formData.vacateNeeded} onChange={(e) => handleInputChange("vacateNeeded", e.target.value)} className={selectCls}>
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {([
            ["septicSystem", "Septic System"],
            ["sufficientPower", "Sufficient Power"],
            ["goodWaterSource", "Good Water Source"],
            ["dumpsterNeeded", "Dumpster Needed"],
            ["asbestosDumpster", "Asbestos Dumpster"],
            ["portableBathroom", "Portable Bathroom"],
          ] as const).map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer bg-slate-50 rounded-lg px-3 py-2">
              <input type="checkbox" checked={formData[field] as boolean}
                onChange={(e) => handleInputChange(field, e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              {label}
            </label>
          ))}
        </div>

        {formData.dumpsterNeeded && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Dumpster Swaps</label>
              <input type="text" value={formData.dumpsterSwaps} onChange={(e) => handleInputChange("dumpsterSwaps", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Open Dumpster</label>
              <select value={formData.openDumpster} onChange={(e) => handleInputChange("openDumpster", e.target.value)} className={selectCls}>
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Dumpster Placement</label>
              <input type="text" value={formData.dumpsterPlacement} onChange={(e) => handleInputChange("dumpsterPlacement", e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Flooring Layers</label>
            <input type="text" value={formData.floringLayers} onChange={(e) => handleInputChange("floringLayers", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Drywall Layers</label>
            <input type="text" value={formData.dryWallLayers} onChange={(e) => handleInputChange("dryWallLayers", e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>HVAC Removal</label>
            <input type="text" value={formData.hvacRemoval} onChange={(e) => handleInputChange("hvacRemoval", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>ACM Disturbed</label>
            <select value={formData.acmDisturbed} onChange={(e) => handleInputChange("acmDisturbed", e.target.value)} className={selectCls}>
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Contents Removal</label>
            <select value={formData.contentsRemove} onChange={(e) => handleInputChange("contentsRemove", e.target.value)} className={selectCls}>
              <option value="">Select...</option>
              <option value="Full">Full</option>
              <option value="Partial">Partial</option>
              <option value="None">None</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Furniture/Appliances</label>
            <select value={formData.furnitureAppliances} onChange={(e) => handleInputChange("furnitureAppliances", e.target.value)} className={selectCls}>
              <option value="">Select...</option>
              <option value="Remove">Remove</option>
              <option value="Cover">Cover</option>
              <option value="None">None</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Customer Informed</label>
          <select value={formData.customerInformed} onChange={(e) => handleInputChange("customerInformed", e.target.value)} className={selectCls}>
            <option value="">Select...</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Field Notes</label>
          <textarea value={formData.fieldNotes} onChange={(e) => handleInputChange("fieldNotes", e.target.value)}
            rows={3} placeholder="Additional notes..." className={inputCls} />
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
          Labor hours auto-populate from Days Needed × 8hrs × Crew Size. Adjust as needed.
        </div>

        {/* Supervisor */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-700 mb-3">Supervisor</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Regular Hours</label>
              <input type="number" step="0.5" value={formData.laborSupervisor.regularHours || ""}
                onChange={(e) => handleInputChange("laborSupervisor.regularHours", parseFloat(e.target.value) || 0)}
                className={inputCls} />
              <p className="text-[10px] text-slate-400 mt-0.5">{formatCurrency(rates.supervisorHourly)}/hr + {formatCurrency(rates.supervisorTaxBurden)} tax</p>
            </div>
            <div>
              <label className={labelCls}>OT Hours</label>
              <input type="number" step="0.5" value={formData.laborSupervisor.otHours || ""}
                onChange={(e) => handleInputChange("laborSupervisor.otHours", parseFloat(e.target.value) || 0)}
                className={inputCls} />
              <p className="text-[10px] text-slate-400 mt-0.5">1.5× rate</p>
            </div>
          </div>
        </div>

        {/* Technician */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-700 mb-3">Technician</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Regular Hours</label>
              <input type="number" step="0.5" value={formData.laborTechnician.regularHours || ""}
                onChange={(e) => handleInputChange("laborTechnician.regularHours", parseFloat(e.target.value) || 0)}
                className={inputCls} />
              <p className="text-[10px] text-slate-400 mt-0.5">{formatCurrency(rates.technicianHourly)}/hr + {formatCurrency(rates.technicianTaxBurden)} tax</p>
            </div>
            <div>
              <label className={labelCls}>OT Hours</label>
              <input type="number" step="0.5" value={formData.laborTechnician.otHours || ""}
                onChange={(e) => handleInputChange("laborTechnician.otHours", parseFloat(e.target.value) || 0)}
                className={inputCls} />
              <p className="text-[10px] text-slate-400 mt-0.5">1.5× rate</p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-indigo-700">Total Labor Cost</span>
          <span className="text-sm font-bold text-indigo-700">{formatCurrency(totals.labor)}</span>
        </div>
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
          Operating costs cover overhead, equipment, insurance, etc. Default rate: {formatCurrency(DEFAULT_OPS_RATE)}/hr.
        </div>
        <div>
          <label className={labelCls}>Per Hour Rate ($)</label>
          <input type="number" step="0.01" value={formData.opsPerHourRate || ""}
            onChange={(e) => handleInputChange("opsPerHourRate", parseFloat(e.target.value) || 0)}
            className={inputCls} />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-slate-500">Total labor hours:</span><span className="font-medium">{totalHours.toFixed(1)} hrs</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Rate × Hours:</span><span className="font-medium">{formatCurrency(formData.opsPerHourRate)} × {totalHours.toFixed(1)}</span></div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-indigo-700">Total Operating Costs</span>
          <span className="text-sm font-bold text-indigo-700">{formatCurrency(totals.ops)}</span>
        </div>
      </div>
    );
  }

  function renderStep5() {
    return (
      <div className="space-y-3">
        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
          Cost of Goods Sold — auto-populated from field data. Edit manually if needed.
        </div>
        <div className="divide-y divide-slate-100">
          {formData.cogs.map((cog, index) => {
            const defaultItem = DEFAULT_COGS.find((d) => d.item === cog.item);
            return (
              <div key={cog.item} className="py-2.5 first:pt-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">{cog.item}</span>
                  <span className="text-xs font-semibold text-slate-800">{formatCurrency(cog.cost)}</span>
                </div>
                {defaultItem?.notes && <p className="text-[10px] text-slate-400 mb-1.5">{defaultItem.notes}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">Qty</label>
                    <input type="number" step="any" value={cog.qty || ""} onChange={(e) => handleCogsChange(index, "qty", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Cost ($)</label>
                    <input type="number" step="0.01" value={cog.cost || ""} onChange={(e) => handleCogsChange(index, "cost", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-indigo-700">Total COGS</span>
          <span className="text-sm font-bold text-indigo-700">{formatCurrency(totals.cogs)}</span>
        </div>
      </div>
    );
  }

  function renderStep6() {
    const materialsToShow = showAllMaterials
      ? formData.materials
      : formData.materials.filter((m) => m.qty > 0 || m.cost > 0);
    const hasHiddenItems = !showAllMaterials && materialsToShow.length < formData.materials.length;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 flex-1">
            Materials auto-populate from labor hours. {totalHours.toFixed(0)} total hours used.
          </div>
          <button onClick={() => setShowAllMaterials(!showAllMaterials)}
            className="ml-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap">
            {showAllMaterials ? "Show active only" : `Show all (${formData.materials.length})`}
          </button>
        </div>

        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
          {materialsToShow.map((mat, displayIdx) => {
            const realIdx = showAllMaterials ? displayIdx : formData.materials.findIndex((m) => m.name === mat.name);
            const matDefault = DEFAULT_MATERIALS.find((m) => m.name === mat.name);
            return (
              <div key={mat.name} className="py-2 first:pt-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">{mat.name}</span>
                  <span className="text-xs font-semibold text-slate-800">{formatCurrency(mat.cost)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">Qty {matDefault?.unit ? `(${matDefault.unit})` : ""}</label>
                    <input type="number" step="any" value={mat.qty || ""} onChange={(e) => handleMaterialChange(realIdx, "qty", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Cost ($)</label>
                    <input type="number" step="0.01" value={mat.cost || ""} onChange={(e) => handleMaterialChange(realIdx, "cost", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-indigo-700">Total Materials</span>
          <span className="text-sm font-bold text-indigo-700">{formatCurrency(totals.materials)}</span>
        </div>
      </div>
    );
  }

  function renderStep7() {
    return (
      <div className="space-y-4">
        {/* Cost summary */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
          <h4 className="text-xs font-semibold text-slate-700 mb-2">Cost Breakdown</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Labor</span><span className="font-medium">{formatCurrency(totals.labor)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Operating Costs</span><span className="font-medium">{formatCurrency(totals.ops)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">COGS</span><span className="font-medium">{formatCurrency(totals.cogs)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Materials</span><span className="font-medium">{formatCurrency(totals.materials)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
              <span className="font-semibold text-slate-700">Total Cost</span>
              <span className="font-bold text-slate-800">{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Markup %</label>
            <input type="number" step="0.5" value={formData.markupPercent || ""}
              onChange={(e) => handleInputChange("markupPercent", parseFloat(e.target.value) || 0)}
              className={inputCls} />
            <p className="text-[10px] text-slate-400 mt-0.5">Auto: 15% + difficulty ({formData.difficultyRating}%)</p>
          </div>
          <div>
            <label className={labelCls}>Customer Price Override ($)</label>
            <input type="number" step="0.01"
              value={formData.customerPriceOverride !== null ? formData.customerPriceOverride : ""}
              onChange={(e) => {
                const val = e.target.value;
                handleInputChange("customerPriceOverride", val === "" ? null : parseFloat(val) || 0);
              }}
              placeholder="Auto-calculated"
              className={inputCls} />
            <p className="text-[10px] text-slate-400 mt-0.5">Leave empty for auto markup</p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Service Description</label>
          <textarea value={formData.serviceDescription} onChange={(e) => handleInputChange("serviceDescription", e.target.value)}
            rows={3} className={inputCls} />
        </div>

        {/* Final price */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-700 block">Change Order Price (Cost Impact)</span>
            <span className="text-[10px] text-emerald-600">Effective markup: {totals.effectiveMarkup}%</span>
          </div>
          <span className="text-xl font-bold text-emerald-700">{formatCurrency(totals.customerPrice)}</span>
        </div>
      </div>
    );
  }

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6, renderStep7];

  /* ─── Main render ─── */
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">New Change Order</h3>
            {projectName && <p className="text-[10px] text-slate-400 mt-0.5">{projectName}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-slate-100 flex-shrink-0 overflow-x-auto">
          {STEPS.map((step, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === currentStep;
            const isDone = stepNum < currentStep;
            return (
              <button key={step} onClick={() => setCurrentStep(stepNum)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition whitespace-nowrap
                  ${isActive ? "bg-indigo-100 text-indigo-700" : isDone ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold
                  ${isActive ? "bg-indigo-600 text-white" : isDone ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {isDone ? "✓" : stepNum}
                </span>
                <span className="hidden sm:inline">{step}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {stepRenderers[currentStep - 1]()}
        </div>

        {/* Footer / navigation */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl flex-shrink-0">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button onClick={() => setCurrentStep((s) => s - 1)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition">
                <ChevronLeft size={14} /> Back
              </button>
            )}
          </div>

          {/* Running cost total */}
          <div className="text-xs text-slate-500 hidden sm:block">
            Total: <span className="font-semibold text-slate-700">{formatCurrency(totals.customerPrice)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition">
              Cancel
            </button>
            {currentStep < 7 ? (
              <button onClick={() => setCurrentStep((s) => s + 1)}
                className="flex items-center gap-1 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={handleSubmit}
                disabled={isLoading || !formData.title.trim() || !formData.description.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Submit for Approval
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
