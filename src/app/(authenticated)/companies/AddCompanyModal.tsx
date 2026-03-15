"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, AlertTriangle } from "lucide-react";
import DuplicateWarningModal from "@/components/DuplicateWarningModal";
import { useDuplicateCheck, DuplicateMatch } from "@/hooks/useDuplicateCheck";

const COMPANY_TYPES = [
  { value: "property_mgmt", label: "Property Management" },
  { value: "school_district", label: "School District" },
  { value: "insurance", label: "Insurance" },
  { value: "general_contractor", label: "General Contractor" },
  { value: "homeowner", label: "Homeowner" },
  { value: "government", label: "Government" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

export default function AddCompanyModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "commercial",
    address: "",
    city: "",
    state: "CO",
    zip: "",
    phone: "",
    email: "",
    website: "",
    notes: "",
    referralFeeEnabled: false,
    referralFeePercent: 10,
  });

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateOverride, setDuplicateOverride] = useState(false);

  const dupFields = useMemo(() => ({
    companyName: form.name,
  }), [form.name]);

  const { matches: dupMatches } =
    useDuplicateCheck("company", dupFields);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDuplicateOverride(false);
  };

  const reset = () => {
    setForm({
      name: "",
      type: "commercial",
      address: "",
      city: "",
      state: "CO",
      zip: "",
      phone: "",
      email: "",
      website: "",
      notes: "",
      referralFeeEnabled: false,
      referralFeePercent: 10,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Company name is required.");
      return;
    }

    if (dupMatches.length > 0 && !duplicateOverride) {
      setShowDuplicateModal(true);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create company.");
        setSaving(false);
        return;
      }

      const company = await res.json();
      setOpen(false);
      reset();
      router.push(`/companies/${company.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-[#7BC143] hover:bg-[#6aad38] text-white text-sm rounded-full font-medium flex items-center gap-2 transition-colors"
      >
        <Plus size={18} />
        Company
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">New Company</h2>
              <button
                onClick={() => { setOpen(false); reset(); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  placeholder="Acme Property Management"
                  autoFocus
                />
              </div>

              {/* Duplicate warning banner */}
              {dupMatches.length > 0 && !duplicateOverride && (
                <div
                  onClick={() => setShowDuplicateModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition"
                >
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-amber-800">
                    {dupMatches.length} similar company{dupMatches.length > 1 ? " names" : " name"} found — click to review
                  </span>
                </div>
              )}

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => update("type", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                >
                  {COMPANY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  placeholder="123 Main St"
                />
              </div>

              {/* City / State / Zip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Zip</label>
                  <input
                    type="text"
                    value={form.zip}
                    onChange={(e) => update("zip", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  />
                </div>
              </div>

              {/* Phone / Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                    placeholder="(303) 555-0100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                    placeholder="info@company.com"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  placeholder="https://company.com"
                />
              </div>

              {/* Referral Fee */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">Referral Fee Required</label>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, referralFeeEnabled: !prev.referralFeeEnabled }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.referralFeeEnabled ? "bg-[#7BC143]" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.referralFeeEnabled ? "translate-x-5" : ""}`} />
                  </button>
                </div>
                {form.referralFeeEnabled && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fee Percentage</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={form.referralFeePercent}
                        onChange={(e) => setForm((prev) => ({ ...prev, referralFeePercent: parseFloat(e.target.value) || 0 }))}
                        className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                      />
                      <span className="text-sm text-slate-500">% of estimate total</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); reset(); }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm bg-[#7BC143] text-white rounded-full hover:bg-[#6aad38] disabled:opacity-50 font-medium"
                >
                  {saving ? "Creating..." : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Duplicate warning modal */}
      {showDuplicateModal && (
        <DuplicateWarningModal
          matches={dupMatches}
          entityType="company"
          onUseExisting={(match) => {
            setOpen(false);
            reset();
            router.push(`/companies/${match.id}`);
          }}
          onCreateAnyway={() => {
            setDuplicateOverride(true);
            setShowDuplicateModal(false);
          }}
          onClose={() => setShowDuplicateModal(false)}
        />
      )}
    </>
  );
}
