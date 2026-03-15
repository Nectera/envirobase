"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, AlertTriangle } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import ReferralSourcePicker from "@/components/ReferralSourcePicker";
import DuplicateWarningModal from "@/components/DuplicateWarningModal";
import { useDuplicateCheck, DuplicateMatch } from "@/hooks/useDuplicateCheck";

const SOURCES = [
  { value: "", label: "Select source..." },
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
};

export default function NewContactForm({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    phone: "",
    mobile: "",
    address: "",
    city: "",
    state: "CO",
    locationNotes: "",
    companyId: "",
    notes: "",
    source: "",
    referralSource: "",
    office: "greeley",
    isInsuranceJob: false,
    insuranceCarrier: "",
    claimNumber: "",
    adjusterName: "",
    adjusterContact: "",
    dateOfLoss: "",
    referredForTesting: false,
    referredTestingTo: "",
  });

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateOverride, setDuplicateOverride] = useState(false);

  const dupFields = useMemo(() => ({
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
  }), [formData.firstName, formData.lastName, formData.email, formData.phone]);

  const { matches: dupMatches, isChecking: dupChecking } =
    useDuplicateCheck("contact", dupFields);

  const update = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setDuplicateOverride(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (dupMatches.length > 0 && !duplicateOverride) {
      setShowDuplicateModal(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let companyId = formData.companyId;

      if (showNewCompany && newCompanyName.trim()) {
        const newCompanyRes = await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCompanyName.trim(), type: "commercial" }),
        });
        const newCompany = await newCompanyRes.json();
        companyId = newCompany.id;
      }

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          companyId: companyId || null,
          dateOfLoss: formData.dateOfLoss || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create contact");
      }

      const contact = await res.json();
      router.push(`/contacts/${contact.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Contacts
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Contact</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

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
              <label className={labelClass}>Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => update("lastName", e.target.value)}
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
            </div>
          )}

          <div className="mb-4">
            <label className={labelClass}>Job Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Project Manager"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(970) 555-1234"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Mobile</label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => update("mobile", e.target.value)}
                placeholder="(970) 555-9876"
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
              }}
              placeholder="Start typing an address..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

        {/* ── Company & Office ── */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
            Company & Office
          </h2>

          <div className="mb-4">
            <label className={labelClass}>Company</label>
            {!showNewCompany ? (
              <div className="flex gap-2">
                <select
                  value={formData.companyId}
                  onChange={(e) => update("companyId", e.target.value)}
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

          <div>
            <label className={labelClass}>Office</label>
            <select
              value={formData.office}
              onChange={(e) => update("office", e.target.value)}
              className={inputClass}
            >
              <option value="greeley">Greeley (Front Range)</option>
              <option value="grand_junction">Grand Junction (Western Slope)</option>
            </select>
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

        {/* ── Referral & Source ── */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
            Referral & Source
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Source</label>
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

        {/* ── Notes ── */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
            Notes
          </h2>
          <textarea
            value={formData.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Any additional notes about this contact..."
            rows={3}
            className={inputClass}
          />
        </div>

        {/* ── Submit ── */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !formData.firstName.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm rounded-lg font-medium transition"
          >
            {loading ? "Creating..." : "Create Contact"}
          </button>
          <Link
            href="/contacts"
            className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm rounded-lg font-medium hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
        </div>
        {/* Duplicate warning modal */}
        {showDuplicateModal && (
          <DuplicateWarningModal
            matches={dupMatches}
            entityType="contact"
            onUseExisting={(match) => {
              router.push(`/contacts/${match.id}`);
            }}
            onCreateAnyway={() => {
              setDuplicateOverride(true);
              setShowDuplicateModal(false);
            }}
            onClose={() => setShowDuplicateModal(false)}
          />
        )}
      </form>
    </div>
  );
}
