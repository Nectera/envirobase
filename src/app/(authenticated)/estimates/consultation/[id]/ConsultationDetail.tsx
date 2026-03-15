"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, DollarSign, X, Pencil } from "lucide-react";
import { LABOR_RATES, DEFAULT_COGS, DEFAULT_MATERIALS } from "@/lib/materials";
import { logger } from "@/lib/logger";

// Flexible type that handles both old nested and new flat data shapes
interface ConsultationEstimateData {
  id: string;
  customerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  milesFromShop: number;
  projectDate: string;

  // Site visit: new format (string[]) or old format (nested object)
  siteVisitRequirements?: string[];
  siteVisit?: {
    metWithCustomer: boolean;
    explainedTimeline: boolean;
    gaveBusinessCard: boolean;
    receivedScope: boolean;
    sketchedProject: boolean;
    photosTaken: boolean;
  };

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

  // Waste: new format (wasteYards/wasteDescription) or old (wasteAmount)
  wasteYards?: number;
  wasteDescription?: string;
  wasteAmount?: string;

  permitRequired: string;
  airClearances: string;
  projectDesign: string;
  deconLoadout: string;
  namsCount: number;
  ductCleaning: string;
  dumpsterNeeded?: boolean;
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

  // Labor: new flat format or old nested format
  supervisorHours?: number;
  supervisorOtHours?: number;
  technicianHours?: number;
  technicianOtHours?: number;
  laborSupervisor?: { regularHours: number; otHours: number };
  laborTechnician?: { regularHours: number; otHours: number };

  // Totals (may be saved as either old or new field names)
  laborTotal?: number;
  laborCost?: number;
  opsTotal?: number;
  opsCost?: number;
  cogsTotal?: number;
  cogsCost?: number;
  materialsTotal?: number;
  materialCost?: number;
  grandTotal?: number;
  totalCost?: number;

  // Operating Costs
  opsPerHourRate?: number;
  opsItems?: Array<{
    name: string;
    perHourRate: number;
    cost: number;
  }>;

  // COGS & Materials - flexible shape
  cogs: Array<{
    item: string;
    qty: number;
    cost: number;
    notes?: string;
  }>;
  materials: Array<{
    name: string;
    unit?: string;
    qty: number;
    unitPrice?: number;
    cost?: number;
  }>;

  status?: string;
  estimateId?: string;
  createdAt?: string;
  updatedAt?: string;

  // Pricing
  markupPercent?: number;
  customerPrice?: number;
  customerPriceOverride?: number | null;
  serviceDescription?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getDifficultyColor(rating: number): string {
  if (rating === 1) return "bg-green-100 text-green-800";
  if (rating === 2) return "bg-lime-100 text-lime-800";
  if (rating === 3) return "bg-amber-100 text-amber-800";
  if (rating === 4) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

function getStatusBadgeColor(status?: string): string {
  if (status === "converted") return "bg-emerald-100 text-emerald-800";
  if (status === "costed") return "bg-blue-100 text-blue-800";
  return "bg-slate-100 text-slate-800";
}

function getStatusLabel(status?: string): string {
  if (status === "converted") return "Converted";
  if (status === "costed") return "Costed";
  return "Draft";
}

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <span
      className={`
      inline-block px-2 py-1 text-xs font-medium rounded
      ${value ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}
    `}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

export default function ConsultationDetail({
  data,
}: {
  data: ConsultationEstimateData;
}) {
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);

  // Normalize labor hours from either flat or nested format
  const supRegHours =
    data.supervisorHours ?? data.laborSupervisor?.regularHours ?? 0;
  const supOtHours =
    data.supervisorOtHours ?? data.laborSupervisor?.otHours ?? 0;
  const techRegHours =
    data.technicianHours ?? data.laborTechnician?.regularHours ?? 0;
  const techOtHours =
    data.technicianOtHours ?? data.laborTechnician?.otHours ?? 0;

  // Calculate labor costs
  const supervisorRate =
    LABOR_RATES.supervisor.hourly + LABOR_RATES.supervisor.taxBurden;
  const supervisorOtRate =
    LABOR_RATES.supervisor.hourly * 1.5 + LABOR_RATES.supervisor.taxBurden;
  const supervisorCost =
    supRegHours * supervisorRate + supOtHours * supervisorOtRate;

  const technicianRate =
    LABOR_RATES.technician.hourly + LABOR_RATES.technician.taxBurden;
  const technicianOtRate =
    LABOR_RATES.technician.hourly * 1.5 + LABOR_RATES.technician.taxBurden;
  const technicianCost =
    techRegHours * technicianRate + techOtHours * technicianOtRate;

  const totalHours = supRegHours + supOtHours + techRegHours + techOtHours;

  const laborTotal = data.laborTotal ?? data.laborCost ?? supervisorCost + technicianCost;
  const opsTotal =
    data.opsTotal ?? data.opsCost ?? (data.opsPerHourRate ? totalHours * data.opsPerHourRate : (data.opsItems || []).reduce((sum, op) => sum + (op.cost || 0), 0));
  const cogsTotal =
    data.cogsTotal ?? data.cogsCost ?? data.cogs.reduce((sum, item) => sum + (item.cost || 0), 0);

  // Materials total: support both old unitPrice and new cost formats
  const materialsTotal =
    data.materialsTotal ?? data.materialCost ??
    data.materials.reduce((sum, mat) => {
      if (mat.cost != null) return sum + mat.cost;
      if (mat.unitPrice != null) return sum + mat.qty * mat.unitPrice;
      return sum;
    }, 0);

  const grandTotal =
    data.grandTotal ?? data.totalCost ?? laborTotal + opsTotal + cogsTotal + materialsTotal;

  // Normalize waste display
  const wasteDisplay =
    data.wasteDescription ||
    (data.wasteYards ? `${data.wasteYards} cubic yards` : data.wasteAmount) ||
    "N/A";

  // Normalize site visit requirements
  const siteVisitReqs = data.siteVisitRequirements || [];
  const hasSiteVisitObject = data.siteVisit != null;

  // Use stored customer price override if available, otherwise auto-calculate
  const autoMarkupPercent = 15 + (data.difficultyRating || 3);
  const hasOverride = data.customerPriceOverride != null && data.customerPriceOverride > 0;
  const customerPrice: number = hasOverride
    ? data.customerPriceOverride!
    : (data.customerPrice ?? grandTotal * (1 + autoMarkupPercent / 100));
  const effectiveMarkupPercent = grandTotal > 0
    ? Math.round(((customerPrice - grandTotal) / grandTotal) * 1000) / 10
    : autoMarkupPercent;
  const autoProfitMargin = customerPrice > 0 ? ((customerPrice - grandTotal) / customerPrice * 100) : 0;

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(effectiveMarkupPercent);
  const [invoicePaymentTerms, setInvoicePaymentTerms] = useState("net_30");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [serviceDescription, setServiceDescription] = useState("Abatement Services");

  const invoiceTotal = grandTotal * (1 + markupPercent / 100);
  const markupAmount = invoiceTotal - grandTotal;
  const profitMarginPreview = invoiceTotal > 0 ? ((invoiceTotal - grandTotal) / invoiceTotal * 100) : 0;

  const handleConvertToInvoice = async () => {
    setIsConverting(true);
    try {
      const response = await fetch("/api/invoices/from-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationEstimateId: data.id,
          markupPercent,
          paymentTerms: invoicePaymentTerms,
          notes: invoiceNotes,
          serviceDescription,
          scope: data.scopeOfWork || "",
        }),
      });

      if (!response.ok) throw new Error("Failed to create invoice");

      const invoice = await response.json();
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      logger.error("Error converting to invoice:", { error: String(error) });
      alert("Failed to convert. Please try again.");
      setIsConverting(false);
    }
  };

  const projectDateObj = new Date(data.projectDate);
  const formattedDate = projectDateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/estimates"
              className="text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              {data.customerName}
            </h1>
            <span
              className={`
              inline-block px-3 py-1 text-xs font-semibold rounded-full
              ${getStatusBadgeColor(data.status)}
            `}
            >
              {getStatusLabel(data.status)}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {data.address}, {data.city}, {data.state} {data.zip}
          </p>
          <p className="text-sm text-slate-600">{formattedDate}</p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/estimates/consultation/${data.id}/edit`}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
          {data.status !== "converted" && (
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Convert to Invoice
            </button>
          )}
          {data.status === "converted" && data.estimateId && (
            <Link
              href={`/invoices/${data.estimateId}`}
              className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Invoice
            </Link>
          )}
        </div>
      </div>

      {/* Site Info Card */}
      <div className="border border-slate-200 rounded-lg p-6 bg-white mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Site Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-slate-600 mb-1">Customer</p>
            <p className="text-sm font-medium text-slate-900">
              {data.customerName}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Address</p>
            <p className="text-sm font-medium text-slate-900">
              {data.address}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">City / State / Zip</p>
            <p className="text-sm font-medium text-slate-900">
              {data.city}, {data.state} {data.zip}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Miles from Shop</p>
            <p className="text-sm font-medium text-slate-900">
              {data.milesFromShop} miles
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Project Date</p>
            <p className="text-sm font-medium text-slate-900">
              {formattedDate}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Payment Type</p>
            <p className="text-sm font-medium text-slate-900">
              {data.paymentType || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Consultation Checklist Card */}
      <div className="border border-slate-200 rounded-lg p-6 bg-white mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">
          Consultation Checklist
        </h2>

        <div className="space-y-6">
          {/* Site Visit Requirements */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Site Visit Requirements
            </h3>
            {siteVisitReqs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {siteVisitReqs.map((req, idx) => (
                  <span
                    key={idx}
                    className="inline-block px-3 py-1 text-xs font-medium rounded bg-green-100 text-green-800"
                  >
                    {req}
                  </span>
                ))}
              </div>
            ) : hasSiteVisitObject ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Met with Customer</span>
                  <YesNoBadge value={data.siteVisit!.metWithCustomer} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Explained Timeline</span>
                  <YesNoBadge value={data.siteVisit!.explainedTimeline} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Gave Business Card</span>
                  <YesNoBadge value={data.siteVisit!.gaveBusinessCard} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Received Scope</span>
                  <YesNoBadge value={data.siteVisit!.receivedScope} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Sketched Project</span>
                  <YesNoBadge value={data.siteVisit!.sketchedProject} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Photos Taken</span>
                  <YesNoBadge value={data.siteVisit!.photosTaken} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">None recorded</p>
            )}
          </div>

          {/* Scope & Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Scope & Timeline
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-600 mb-1">Scope of Work</p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap">
                  {data.scopeOfWork || "N/A"}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Days Needed</p>
                  <p className="text-sm font-medium text-slate-900">
                    {data.daysNeeded}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Crew Size</p>
                  <p className="text-sm font-medium text-slate-900">
                    {data.crewSize}
                    {data.permitRequired === "Yes" &&
                      data.crewSize > 0 &&
                      ` (1 sup + ${Math.max(data.crewSize - 1, 0)} tech)`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Type of Loss</p>
                  <p className="text-sm font-medium text-slate-900">
                    {data.typeOfLoss || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Site Conditions */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Site Conditions
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Septic System</span>
                <YesNoBadge value={data.septicSystem} />
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Customer Need to Vacate</p>
                <p className="text-sm text-slate-900">{data.vacateNeeded || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Drive Time (hours)</p>
                <p className="text-sm text-slate-900">{data.driveTimeHours}</p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Sufficient Power</span>
                <YesNoBadge value={data.sufficientPower} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Good Water Source</span>
                <YesNoBadge value={data.goodWaterSource} />
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-2">Difficulty Rating</p>
                <span
                  className={`inline-block px-3 py-1 text-xs font-semibold rounded ${getDifficultyColor(data.difficultyRating)}`}
                >
                  {data.difficultyRating}/5
                </span>
              </div>
            </div>
          </div>

          {/* Waste & Containment */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Waste & Containment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">Waste</p>
                <p className="text-sm text-slate-900">{wasteDisplay}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Permit Required</p>
                <p className="text-sm text-slate-900">{data.permitRequired || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Air Clearances</p>
                <p className="text-sm text-slate-900">{data.airClearances || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Project Design</p>
                <p className="text-sm text-slate-900">{data.projectDesign || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Decon & Load-out</p>
                <p className="text-sm text-slate-900">{data.deconLoadout || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">NAMs Count</p>
                <p className="text-sm text-slate-900">{data.namsCount}</p>
              </div>
            </div>
          </div>

          {/* Dumpsters & Equipment */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Dumpsters & Equipment
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-600 mb-1">Duct Cleaning</p>
                <p className="text-sm text-slate-900">{data.ductCleaning || "N/A"}</p>
              </div>
              {(data.dumpsterNeeded || data.asbestosDumpster || data.dumpsterSwaps || data.dumpsterPlacement) && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Asbestos Dumpster</span>
                    <YesNoBadge value={data.asbestosDumpster} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Dumpster Swaps</p>
                    <p className="text-sm text-slate-900">{data.dumpsterSwaps || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Open Dumpster</p>
                    <p className="text-sm text-slate-900">{data.openDumpster || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Dumpster Placement</p>
                    <p className="text-sm text-slate-900">{data.dumpsterPlacement || "N/A"}</p>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Portable Bathroom</span>
                <YesNoBadge value={data.portableBathroom} />
              </div>
            </div>
          </div>

          {/* Material Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Material Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">Flooring Layers</p>
                <p className="text-sm text-slate-900">{data.floringLayers || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Drywall Layers</p>
                <p className="text-sm text-slate-900">{data.dryWallLayers || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">HVAC Removal</p>
                <p className="text-sm text-slate-900">{data.hvacRemoval || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">ACM Disturbed</p>
                <p className="text-sm text-slate-900">{data.acmDisturbed || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Contents & Customer */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Contents & Customer
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-600 mb-1">Contents to Remove</p>
                <p className="text-sm text-slate-900">{data.contentsRemove || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Furniture/Appliances</p>
                <p className="text-sm text-slate-900">{data.furnitureAppliances || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Customer Responsibilities</p>
                <p className="text-sm text-slate-900">{data.customerInformed || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Field Notes */}
          {data.fieldNotes && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Field Notes
              </h3>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">
                {data.fieldNotes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cost Breakdown - Labor */}
      <div className="border border-slate-200 rounded-lg p-6 bg-white mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Labor Cost</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 font-semibold text-slate-900">Role</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-900">Hours</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-900">OT Hours</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-900">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-3 px-3 text-slate-700 font-medium">Supervisor</td>
                <td className="py-3 px-3 text-right text-slate-900">{supRegHours}</td>
                <td className="py-3 px-3 text-right text-slate-900">{supOtHours}</td>
                <td className="py-3 px-3 text-right text-slate-900 font-semibold">
                  {formatCurrency(supervisorCost)}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-3 px-3 text-slate-700 font-medium">Technician</td>
                <td className="py-3 px-3 text-right text-slate-900">{techRegHours}</td>
                <td className="py-3 px-3 text-right text-slate-900">{techOtHours}</td>
                <td className="py-3 px-3 text-right text-slate-900 font-semibold">
                  {formatCurrency(technicianCost)}
                </td>
              </tr>
              <tr className="bg-indigo-50">
                <td colSpan={3} className="py-3 px-3 font-semibold text-slate-900">Total</td>
                <td className="py-3 px-3 text-right font-bold text-indigo-600">
                  {formatCurrency(laborTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Breakdown - Operating Costs */}
      {opsTotal > 0 && (
        <div className="border border-slate-200 rounded-lg p-6 bg-white mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Operating Costs</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              {data.opsPerHourRate ? `${formatCurrency(data.opsPerHourRate)}/hr` : "Flat rate"}
              {data.opsPerHourRate && totalHours > 0 ? ` x ${totalHours.toFixed(1)} hrs` : ""}
            </span>
            <span className="text-lg font-bold text-indigo-600">{formatCurrency(opsTotal)}</span>
          </div>
        </div>
      )}

      {/* Cost Breakdown - COGS */}
      {data.cogs.some((item) => item.cost > 0) && (
        <div className="border border-slate-200 rounded-lg p-6 bg-white mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">COGS</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-900">Item</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-900">Qty</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-900">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.cogs
                  .filter((item) => item.cost > 0)
                  .map((item, idx) => {
                    const defaultNotes = DEFAULT_COGS.find(
                      (c) => c.item === item.item
                    )?.notes;
                    return (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-3 px-3">
                          <p className="text-slate-700 font-medium">{item.item}</p>
                          {defaultNotes && (
                            <p className="text-xs text-slate-500 mt-1">{defaultNotes}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900">{item.qty}</td>
                        <td className="py-3 px-3 text-right text-slate-900">
                          {formatCurrency(item.cost)}
                        </td>
                      </tr>
                    );
                  })}
                <tr className="bg-indigo-50">
                  <td colSpan={2} className="py-3 px-3 font-semibold text-slate-900">Total</td>
                  <td className="py-3 px-3 text-right font-bold text-indigo-600">
                    {formatCurrency(cogsTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cost Breakdown - Materials */}
      {data.materials.some((mat) => mat.qty > 0 || (mat.cost && mat.cost > 0)) && (
        <div className="border border-slate-200 rounded-lg p-6 bg-white mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Materials</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-900">Material</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-900">Qty</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-900">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.materials
                  .filter((mat) => mat.qty > 0 || (mat.cost && mat.cost > 0))
                  .map((material, idx) => {
                    const matDefault = DEFAULT_MATERIALS.find(
                      (m) => m.name === material.name
                    );
                    const matCost =
                      material.cost != null
                        ? material.cost
                        : material.qty * (material.unitPrice || 0);
                    const isFuelSurcharge = material.name === "Fuel Surcharge";

                    return (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-3 px-3">
                          <p className="text-slate-700 font-medium">{material.name}</p>
                          {matDefault && (
                            <p className="text-xs text-slate-500">{matDefault.unit}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900">
                          {isFuelSurcharge ? "(2.56%)" : material.qty}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900">
                          {formatCurrency(matCost)}
                        </td>
                      </tr>
                    );
                  })}
                <tr className="bg-indigo-50">
                  <td colSpan={2} className="py-3 px-3 font-semibold text-slate-900">Total</td>
                  <td className="py-3 px-3 text-right font-bold text-indigo-600">
                    {formatCurrency(materialsTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="border border-slate-200 rounded-lg p-6 bg-white mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Cost Summary</h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Labor</span>
            <span className="font-medium text-slate-900">{formatCurrency(laborTotal)}</span>
          </div>
          {opsTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Operating Costs</span>
              <span className="font-medium text-slate-900">{formatCurrency(opsTotal)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-600">COGS</span>
            <span className="font-medium text-slate-900">{formatCurrency(cogsTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Materials</span>
            <span className="font-medium text-slate-900">{formatCurrency(materialsTotal)}</span>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <div className="flex justify-between">
              <span className="font-bold text-slate-900">Internal Cost</span>
              <span className="text-xl font-bold text-indigo-600">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          {/* Customer Pricing */}
          <div className={`border-t pt-3 mt-3 ${hasOverride ? "border-amber-200" : "border-slate-200"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${hasOverride ? "text-amber-600" : "text-emerald-600"}`}>
              Customer Pricing {hasOverride && "(Manual Override)"}
            </p>
            <div className="flex justify-between">
              <span className="text-slate-600">
                Markup ({effectiveMarkupPercent}%)
                {!hasOverride && (
                  <span className="text-xs text-slate-400 ml-1">
                    (15% base + {data.difficultyRating || 3}% difficulty)
                  </span>
                )}
                {hasOverride && (
                  <span className="text-xs text-amber-500 ml-1">(adjusted from override)</span>
                )}
              </span>
              <span className={`font-medium ${hasOverride ? "text-amber-600" : "text-emerald-600"}`}>+{formatCurrency(customerPrice - grandTotal)}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="font-bold text-slate-900">Customer Price</span>
              <span className={`text-xl font-bold ${hasOverride ? "text-amber-600" : "text-emerald-600"}`}>
                {formatCurrency(customerPrice)}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-500">Profit Margin</span>
              <span className={`text-xs font-medium ${hasOverride ? "text-amber-600" : "text-emerald-600"}`}>{autoProfitMargin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Back to estimates link */}
      <div className="mb-8">
        <Link
          href="/estimates"
          className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
        >
          Back to estimates
        </Link>
      </div>

      {/* Invoice Conversion Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Convert to Invoice</h2>
                <p className="text-sm text-slate-500 mt-1">Create a customer-facing invoice from this estimate</p>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Service Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Service Description (shown to customer)
                </label>
                <input
                  type="text"
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g. Abatement Services"
                />
              </div>

              {/* Internal Cost Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Internal Cost (Not Shown to Customer)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Labor</span>
                    <span className="font-medium">{formatCurrency(laborTotal)}</span>
                  </div>
                  {opsTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Operating Costs</span>
                      <span className="font-medium">{formatCurrency(opsTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">COGS</span>
                    <span className="font-medium">{formatCurrency(cogsTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Materials</span>
                    <span className="font-medium">{formatCurrency(materialsTotal)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="font-semibold text-slate-900">Total Cost</span>
                    <span className="font-bold text-slate-900">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Markup Slider */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Markup Percentage
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex items-center bg-slate-100 rounded-lg">
                    <input
                      type="number"
                      min="0"
                      max="200"
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-2 text-center text-sm font-semibold bg-transparent border-none focus:outline-none"
                    />
                    <span className="pr-3 text-sm text-slate-500">%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {hasOverride ? `From estimate override: ${effectiveMarkupPercent}%` : `Auto-calculated: ${autoMarkupPercent}% (15% base + ${data.difficultyRating || 3}% difficulty rating)`}
                </p>
                <div className="flex gap-2 mt-2">
                  {[15, 16, 17, 18, 20].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setMarkupPercent(pct)}
                      className={`px-3 py-1 text-xs rounded-full border transition ${
                        markupPercent === pct
                          ? "bg-emerald-100 border-emerald-300 text-emerald-700 font-semibold"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Invoice Preview */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3">What the Customer Sees</p>
                <div className="bg-white rounded-lg border border-emerald-100 p-3 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-800 font-medium">{serviceDescription || "Abatement Services"}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(invoiceTotal)}</span>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Your cost</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Markup ({markupPercent}%)</span>
                    <span className="text-emerald-600">+{formatCurrency(markupAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>Profit margin</span>
                    <span>{profitMarginPreview.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Terms</label>
                <select
                  value={invoicePaymentTerms}
                  onChange={(e) => setInvoicePaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="due_on_receipt">Due on Receipt</option>
                  <option value="net_15">Net 15</option>
                  <option value="net_30">Net 30</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Invoice Notes (Optional)</label>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  rows={3}
                  placeholder="Additional notes for the customer..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToInvoice}
                disabled={isConverting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                {isConverting ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
