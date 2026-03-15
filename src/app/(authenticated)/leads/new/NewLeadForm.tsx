"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, AlertTriangle } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import ReferralSourcePicker from "@/components/ReferralSourcePicker";
import DuplicateWarningModal from "@/components/DuplicateWarningModal";
import { useDuplicateCheck, DuplicateMatch } from "@/hooks/useDuplicateCheck";
import { logger } from "@/lib/logger";

const PROJECT_TYPES = ["ASBESTOS", "LEAD", "METH", "MOLD", "SELECT_DEMO", "REBUILD"];
const SOURCES = [
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "cold_call", label: "Cold Call" },
  { value: "repeat_client", label: "Repeat Client" },
  { value: "insurance", label: "Insurance" },
  { value: "property_manager", label: "Property Manager" },
  { value: "realtor", label: "Realtor" },
  { value: "other", label: "Other" },
];

type Company = {
  id: string;
  name: string;
  type?: string;
  city?: string;
  contacts?: Contact[];
};

type Contact = {
  id: string;
  name: string;
  email?: string;
  companyId: string;
};

export default function NewLeadForm({
  companies,
  contacts,
}: {
  companies: Company[];
  contacts: Contact[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "CO",
    zip: "",
    locationNotes: "",
    companyId: "",
    contactId: "",
    projectType: "",
    source: "referral",
    estimatedValue: "",
    notes: "",
    isInsuranceJob: false,
    insuranceCarrier: "",
    claimNumber: "",
    adjusterName: "",
    adjusterContact: "",
    dateOfLoss: "",
    referralSource: "",
    referredForTesting: false,
    referredTestingTo: "",
    office: "greeley",
    siteVisitDate: "",
    siteVisitTime: "",
    siteVisitNotes: "",
  });

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateOverride, setDuplicateOverride] = useState(false);

  // Duplicate check hook — fires as user types name/email/phone
  const dupFields = useMemo(() => ({
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
  }), [formData.firstName, formData.lastName, formData.email, formData.phone]);

  const { matches: dupMatches, isChecking: dupChecking, showWarning: dupWarning, dismissWarning: dupDismiss } =
    useDuplicateCheck("lead", dupFields);

  const availableContacts = formData.companyId
    ? contacts.filter((c) => c.companyId === formData.companyId)
    : [];

  const update = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setDuplicateOverride(false); // Reset override when form changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If duplicates found and user hasn't overridden, show modal
    if (dupMatches.length > 0 && !duplicateOverride) {
      setShowDuplicateModal(true);
      return;
    }

    setLoading(true);

    try {
      let companyId = formData.companyId;

      if (showNewCompany && newCompanyName.trim()) {
        const newCompanyRes = await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCompanyName.trim(),
            type: "commercial",
          }),
        });
        const newCompany = await newCompanyRes.json();
        companyId = newCompany.id;
      }

      const leadName = `${formData.firstName} ${formData.lastName}`.trim();

      // Smart initial status based on source and site visit
      let initialStatus = "new";
      if (formData.source === "cold_call" && formData.siteVisitDate) {
        initialStatus = "site_visit";
      } else if (formData.source === "referral") {
        initialStatus = "contacted";
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          companyId,
          contactId: formData.contactId || null,
          estimatedValue: formData.estimatedValue
            ? Number(formData.estimatedValue)
            : 0,
          status: initialStatus,
          title: `${leadName || "New Lead"} - ${formData.projectType.split(",").join(" / ")}`,
          description: formData.notes,
          dateOfLoss: formData.dateOfLoss || null,
          siteVisitDate: formData.siteVisitDate || null,
          siteVisitTime: formData.siteVisitTime || null,
          siteVisitNotes: formData.siteVisitNotes || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create lead");
      }
      const lead = await res.json();
      router.push(`/leads/${lead.id}`);
    } catch (err: any) {
      logger.error("Error creating lead:", { error: String(err) });
      setError(err.message || "Failed to create lead. Please try again.");
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      {/* ── Contact Information ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
          Contact Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              required
              placeholder="First name"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              required
              placeholder="Last name"
              className={inputClass}
            />
          </div>
        </div>

        {/* Duplicate warning banner */}
        {dupMatches.length > 0 && !duplicateOverride && (
          <div
            onClick={() => setShowDuplicateModal(true)}
            className="flex items-center gap-2 px-3 py-2 mb-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition"
          >
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-800">
              {dupMatches.length} potential duplicate{dupMatches.length > 1 ? "s" : ""} found — click to review
            </span>
            {dupChecking && (
              <span className="text-[10px] text-amber-500 ml-auto">Checking...</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="(970) 555-1234"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="email@example.com"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Property / Location ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
          Property / Location
        </h2>

        <div className="mb-4">
          <label className={labelClass}>Address</label>
          <AddressAutocomplete
            value={formData.address}
            onChange={(val) => update("address", val)}
            onSelect={(result) => {
              update("address", result.address);
              if (result.city) update("city", result.city);
              if (result.state) update("state", result.state);
              if (result.zip) update("zip", result.zip);
            }}
            placeholder="Start typing an address..."
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="City"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => update("state", e.target.value)}
              placeholder="CO"
              maxLength={2}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Zip Code</label>
            <input
              type="text"
              value={formData.zip}
              onChange={(e) => update("zip", e.target.value)}
              placeholder="80634"
              maxLength={10}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Location Notes</label>
          <textarea
            value={formData.locationNotes}
            onChange={(e) => update("locationNotes", e.target.value)}
            placeholder="Gate codes, access instructions, unit numbers, etc."
            rows={2}
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Company & Project Details ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
          Company & Project Details
        </h2>

        {/* Company */}
        <div className="mb-4">
          <label className={labelClass}>Company</label>
          {!showNewCompany ? (
            <div className="flex gap-2">
              <select
                value={formData.companyId}
                onChange={(e) => {
                  update("companyId", e.target.value);
                  update("contactId", "");
                }}
                className={`flex-1 ${inputClass}`}
              >
                <option value="">No company (residential / homeowner)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCompany(true)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-1 whitespace-nowrap"
              >
                <Plus size={14} /> New
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Company name"
                className={`flex-1 ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => {
                  setShowNewCompany(false);
                  setNewCompanyName("");
                }}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Contact */}
        {formData.companyId && availableContacts.length > 0 && (
          <div className="mb-4">
            <label className={labelClass}>Company Contact</label>
            <select
              value={formData.contactId}
              onChange={(e) => update("contactId", e.target.value)}
              className={inputClass}
            >
              <option value="">No contact assigned</option>
              {availableContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Project Type, Office & Value */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={labelClass}>
              Project Type <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PROJECT_TYPES.map((type) => {
                const selected = formData.projectType.split(",").filter(Boolean).includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const current = formData.projectType.split(",").filter(Boolean);
                      const next = selected
                        ? current.filter((t) => t !== type)
                        : [...current, type];
                      update("projectType", next.join(","));
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      selected
                        ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {type === "SELECT_DEMO" ? "Select Demo" : type === "METH" ? "Meth Lab" : type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
            {!formData.projectType && (
              <p className="text-[11px] text-red-500 mt-1">Select at least one type</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              Office <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.office}
              onChange={(e) => update("office", e.target.value)}
              required
              className={inputClass}
            >
              <option value="greeley">Greeley (Front Range)</option>
              <option value="grand_junction">Grand Junction (Western Slope)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Estimated Value ($)</label>
            <input
              type="number"
              value={formData.estimatedValue}
              onChange={(e) => update("estimatedValue", e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelClass}>Project Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Scope details, special conditions, material types, square footage..."
            rows={3}
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Insurance Information ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
          Insurance Information
        </h2>

        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isInsuranceJob}
              onChange={(e) => update("isInsuranceJob", e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">
              This is an insurance job
            </span>
          </label>
        </div>

        {formData.isInsuranceJob && (
          <div className="space-y-4 pl-7 border-l-2 border-indigo-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Insurance Carrier</label>
                <input
                  type="text"
                  value={formData.insuranceCarrier}
                  onChange={(e) => update("insuranceCarrier", e.target.value)}
                  placeholder="State Farm, USAA, etc."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Claim Number</label>
                <input
                  type="text"
                  value={formData.claimNumber}
                  onChange={(e) => update("claimNumber", e.target.value)}
                  placeholder="Claim #"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Adjuster Name</label>
                <input
                  type="text"
                  value={formData.adjusterName}
                  onChange={(e) => update("adjusterName", e.target.value)}
                  placeholder="Adjuster name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Adjuster Contact</label>
                <input
                  type="text"
                  value={formData.adjusterContact}
                  onChange={(e) => update("adjusterContact", e.target.value)}
                  placeholder="Phone or email"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="max-w-xs">
              <label className={labelClass}>Date of Loss</label>
              <input
                type="date"
                value={formData.dateOfLoss}
                onChange={(e) => update("dateOfLoss", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Referral & Testing ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
          Referral & Testing
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Lead Source</label>
            <select
              value={formData.source}
              onChange={(e) => update("source", e.target.value)}
              className={inputClass}
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Referral Source</label>
            <ReferralSourcePicker
              value={formData.referralSource}
              onChange={(val) => update("referralSource", val)}
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={formData.referredForTesting}
              onChange={(e) => update("referredForTesting", e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">
              Referred out for testing services
            </span>
          </label>

          {formData.referredForTesting && (
            <div className="pl-7 border-l-2 border-indigo-100">
              <label className={labelClass}>Referred To</label>
              <input
                type="text"
                value={formData.referredTestingTo}
                onChange={(e) => update("referredTestingTo", e.target.value)}
                placeholder="Testing company or contact name"
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Site Visit Schedule ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
          Site Visit Schedule
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          {formData.source === "cold_call"
            ? "Cold call with service scheduled — filling this in will set the lead directly to Site Visit stage."
            : "Schedule a site visit if one is already planned."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>
              Visit Date
              {formData.source === "cold_call" && formData.siteVisitTime && (
                <span className="text-red-500"> *</span>
              )}
            </label>
            <input
              type="date"
              value={formData.siteVisitDate}
              onChange={(e) => update("siteVisitDate", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Visit Time</label>
            <input
              type="time"
              value={formData.siteVisitTime}
              onChange={(e) => update("siteVisitTime", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Site Visit Notes</label>
          <textarea
            value={formData.siteVisitNotes}
            onChange={(e) => update("siteVisitNotes", e.target.value)}
            placeholder="Access instructions, what to bring, special conditions..."
            rows={2}
            className={inputClass}
          />
        </div>

        {formData.source === "cold_call" && formData.siteVisitDate && (
          <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            This lead will be created in the <strong>Site Visit</strong> stage and a task will be auto-assigned to the office estimator.
          </div>
        )}
        {formData.source === "referral" && (
          <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            Referral leads start in the <strong>Contacted</strong> stage.
          </div>
        )}
      </div>

      {/* ── Error & Submit ── */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !formData.firstName.trim() || !formData.lastName.trim()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm rounded-lg font-medium transition"
        >
          {loading ? "Creating..." : "Create Lead"}
        </button>
        <Link
          href="/leads"
          className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm rounded-lg font-medium hover:bg-slate-50 transition"
        >
          Cancel
        </Link>
      </div>
      {/* Duplicate warning modal */}
      {showDuplicateModal && (
        <DuplicateWarningModal
          matches={dupMatches}
          entityType="lead"
          onUseExisting={(match) => {
            router.push(`/leads/${match.id}`);
          }}
          onAddNewLead={(match) => {
            // Pre-fill contactId/companyId from the matching lead
            if (match.contactId) update("contactId", match.contactId);
            if (match.companyId) update("companyId", match.companyId);
            setDuplicateOverride(true);
            setShowDuplicateModal(false);
          }}
          onCreateAnyway={() => {
            setDuplicateOverride(true);
            setShowDuplicateModal(false);
          }}
          onClose={() => setShowDuplicateModal(false)}
        />
      )}
    </form>
  );
}
