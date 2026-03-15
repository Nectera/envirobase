"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Phone, Mail, Globe, MapPin, Save, Loader2, Plus, Pencil, Trash2, X, Shield, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";

type CompanyInfo = {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  ownerName: string;
  ein: string;
};

type License = {
  id: string;
  type: string;
  name: string;
  licenseNumber: string;
  issuingAuthority: string;
  issuedDate: string;
  expirationDate: string;
  status: string;
  notes: string;
};

const emptyInfo: CompanyInfo = {
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  website: "",
  ownerName: "",
  ein: "",
};

const LICENSE_TYPES = [
  { value: "cdphe_asbestos", label: "CDPHE Asbestos Abatement Contractor" },
  { value: "cdphe_lead", label: "CDPHE Lead Abatement Contractor" },
  { value: "epa_lead", label: "EPA Lead RRP Certified Firm" },
  { value: "osha", label: "OSHA Certification" },
  { value: "contractors_license", label: "General Contractors License" },
  { value: "insurance_gl", label: "General Liability Insurance" },
  { value: "insurance_wc", label: "Workers Compensation Insurance" },
  { value: "insurance_pollution", label: "Pollution Liability Insurance" },
  { value: "insurance_auto", label: "Commercial Auto Insurance" },
  { value: "other", label: "Other" },
];

const typeLabelMap: Record<string, string> = Object.fromEntries(LICENSE_TYPES.map((t) => [t.value, t.label]));

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function statusBadge(status: string, expirationDate: string) {
  const days = expirationDate ? daysUntil(expirationDate) : 999;

  if (status === "expired" || days < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
        <AlertTriangle size={11} /> Expired
      </span>
    );
  }
  if (status === "pending_renewal" || (days >= 0 && days <= 60)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
        <Clock size={11} /> {days <= 60 && days >= 0 ? `Expires in ${days}d` : "Pending Renewal"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
      <CheckCircle2 size={11} /> Active
    </span>
  );
}

export default function CompanyPage({
  initialInfo,
  initialLicenses,
}: {
  initialInfo: CompanyInfo | null;
  initialLicenses: License[];
}) {
  const router = useRouter();

  // ── Company Info ── merge with defaults so undefined fields don't show as "undefined"
  const mergedInfo: CompanyInfo = {
    ...emptyInfo,
    ...(initialInfo || {}),
  };
  const hasData = initialInfo && (initialInfo.name || initialInfo.address || initialInfo.phone || initialInfo.email);
  const [info, setInfo] = useState<CompanyInfo>(mergedInfo);
  const [editingInfo, setEditingInfo] = useState(!hasData);
  const [savingInfo, setSavingInfo] = useState(false);

  async function saveInfo() {
    setSavingInfo(true);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Error saving: ${data.error || "Unknown error"}`);
        return;
      }
      setEditingInfo(false);
      router.refresh();
    } catch (err: any) {
      alert(`Error saving: ${err.message || "Network error"}`);
    } finally {
      setSavingInfo(false);
    }
  }

  // ── Licenses ──
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [savingLicense, setSavingLicense] = useState(false);
  const [licenseForm, setLicenseForm] = useState({
    type: "cdphe_asbestos",
    name: "",
    licenseNumber: "",
    issuingAuthority: "",
    issuedDate: "",
    expirationDate: "",
    status: "active",
    notes: "",
  });

  function resetLicenseForm() {
    setLicenseForm({
      type: "cdphe_asbestos",
      name: "",
      licenseNumber: "",
      issuingAuthority: "",
      issuedDate: "",
      expirationDate: "",
      status: "active",
      notes: "",
    });
    setShowLicenseForm(false);
    setEditingLicenseId(null);
  }

  function editLicense(lic: License) {
    setLicenseForm({
      type: lic.type,
      name: lic.name,
      licenseNumber: lic.licenseNumber,
      issuingAuthority: lic.issuingAuthority,
      issuedDate: lic.issuedDate,
      expirationDate: lic.expirationDate,
      status: lic.status,
      notes: lic.notes,
    });
    setEditingLicenseId(lic.id);
    setShowLicenseForm(true);
  }

  async function saveLicense() {
    setSavingLicense(true);
    if (editingLicenseId) {
      await fetch(`/api/company/licenses/${editingLicenseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(licenseForm),
      });
    } else {
      await fetch("/api/company/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(licenseForm),
      });
    }
    setSavingLicense(false);
    resetLicenseForm();
    router.refresh();
  }

  async function deleteLicense(id: string) {
    if (!confirm("Remove this license record?")) return;
    await fetch(`/api/company/licenses/${id}`, { method: "DELETE" });
    router.refresh();
  }

  // Count expiring soon
  const expiringSoon = initialLicenses.filter((l) => {
    const days = l.expirationDate ? daysUntil(l.expirationDate) : 999;
    return days >= 0 && days <= 60;
  }).length;
  const expiredCount = initialLicenses.filter((l) => {
    const days = l.expirationDate ? daysUntil(l.expirationDate) : 999;
    return days < 0 || l.status === "expired";
  }).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Building2 size={24} className="text-indigo-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Company Information</h1>
          <p className="text-sm text-slate-500">Manage EnviroBase&apos;s company profile, licenses, and insurance</p>
        </div>
      </div>

      {/* Alert Banner */}
      {(expiringSoon > 0 || expiredCount > 0) && (
        <div className={`rounded-lg border p-3 mb-5 flex items-center gap-3 text-sm ${
          expiredCount > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          <AlertTriangle size={16} />
          {expiredCount > 0 && <span>{expiredCount} license(s) expired.</span>}
          {expiringSoon > 0 && <span>{expiringSoon} license(s) expiring within 60 days.</span>}
        </div>
      )}

      {/* ── Company Info Card ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Building2 size={15} className="text-slate-400" /> Company Profile
          </h2>
          {!editingInfo && (
            <button onClick={() => setEditingInfo(true)} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>

        {editingInfo ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Company Name" value={info.name} onChange={(v) => setInfo({ ...info, name: v })} />
              <Field label="Owner / Principal" value={info.ownerName} onChange={(v) => setInfo({ ...info, ownerName: v })} />
              <Field label="Street Address" value={info.address} onChange={(v) => setInfo({ ...info, address: v })} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Field label="City" value={info.city} onChange={(v) => setInfo({ ...info, city: v })} />
                <Field label="State" value={info.state} onChange={(v) => setInfo({ ...info, state: v })} />
                <Field label="ZIP" value={info.zip} onChange={(v) => setInfo({ ...info, zip: v })} />
              </div>
              <Field label="Phone" value={info.phone} onChange={(v) => setInfo({ ...info, phone: v })} placeholder="(970) 555-0123" />
              <Field label="Email" value={info.email} onChange={(v) => setInfo({ ...info, email: v })} placeholder="info@company.com" />
              <Field label="Website" value={info.website} onChange={(v) => setInfo({ ...info, website: v })} placeholder="https://yourcompany.com" />
              <Field label="EIN" value={info.ein} onChange={(v) => setInfo({ ...info, ein: v })} placeholder="XX-XXXXXXX" />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveInfo}
                disabled={savingInfo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingInfo ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
              {initialInfo && (
                <button onClick={() => { setInfo(initialInfo); setEditingInfo(false); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200">
                  <X size={12} /> Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm">
            <InfoRow icon={<Building2 size={14} />} label="Company" value={info.name} />
            <InfoRow icon={<Building2 size={14} />} label="Owner" value={info.ownerName} />
            <InfoRow icon={<MapPin size={14} />} label="Address" value={[info.address, info.city, [info.state, info.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")} />
            <InfoRow icon={<Phone size={14} />} label="Phone" value={info.phone} />
            <InfoRow icon={<Mail size={14} />} label="Email" value={info.email} />
            <InfoRow icon={<Globe size={14} />} label="Website" value={info.website} />
            <InfoRow icon={<Shield size={14} />} label="EIN" value={info.ein} />
          </div>
        )}
      </div>

      {/* ── Licenses & Insurance ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Shield size={15} className="text-slate-400" /> Licenses, Certifications &amp; Insurance
          </h2>
          {!showLicenseForm && (
            <button
              onClick={() => { resetLicenseForm(); setShowLicenseForm(true); }}
              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus size={14} /> Add License
            </button>
          )}
        </div>

        {showLicenseForm && (
          <div className="bg-slate-50 rounded-lg border border-indigo-200 p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select
                  value={licenseForm.type}
                  onChange={(e) => setLicenseForm({ ...licenseForm, type: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {LICENSE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <Field label="Name / Description" value={licenseForm.name} onChange={(v) => setLicenseForm({ ...licenseForm, name: v })} placeholder="e.g. Colorado Asbestos Abatement" />
              <Field label="License / Policy Number" value={licenseForm.licenseNumber} onChange={(v) => setLicenseForm({ ...licenseForm, licenseNumber: v })} />
              <Field label="Issuing Authority" value={licenseForm.issuingAuthority} onChange={(v) => setLicenseForm({ ...licenseForm, issuingAuthority: v })} placeholder="e.g. CDPHE, EPA, State of Colorado" />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Issued Date</label>
                <input
                  type="date"
                  value={licenseForm.issuedDate}
                  onChange={(e) => setLicenseForm({ ...licenseForm, issuedDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={licenseForm.expirationDate}
                  onChange={(e) => setLicenseForm({ ...licenseForm, expirationDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select
                  value={licenseForm.status}
                  onChange={(e) => setLicenseForm({ ...licenseForm, status: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="pending_renewal">Pending Renewal</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <Field label="Notes" value={licenseForm.notes} onChange={(v) => setLicenseForm({ ...licenseForm, notes: v })} placeholder="Additional details..." />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveLicense}
                disabled={savingLicense}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingLicense ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {editingLicenseId ? "Update" : "Save"} License
              </button>
              <button onClick={resetLicenseForm} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200">
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        )}

        {initialLicenses.length === 0 && !showLicenseForm ? (
          <div className="py-8 text-center">
            <Shield size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No licenses or insurance records added yet</p>
            <p className="text-xs text-slate-400 mt-1">Add your CDPHE, EPA, and insurance information to keep track of renewals</p>
          </div>
        ) : initialLicenses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-slate-500">Type</th>
                  <th className="px-4 py-2 text-xs font-medium text-slate-500">License / Policy #</th>
                  <th className="px-4 py-2 text-xs font-medium text-slate-500">Issuing Authority</th>
                  <th className="px-4 py-2 text-xs font-medium text-slate-500">Expires</th>
                  <th className="px-4 py-2 text-xs font-medium text-slate-500">Status</th>
                  <th className="px-4 py-2 text-xs font-medium text-slate-500 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialLicenses.map((lic) => (
                  <tr key={lic.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-700">{typeLabelMap[lic.type] || lic.type}</div>
                      {lic.name && <div className="text-xs text-slate-400">{lic.name}</div>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{lic.licenseNumber || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{lic.issuingAuthority || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {lic.expirationDate ? new Date(lic.expirationDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2.5">{statusBadge(lic.status, lic.expirationDate)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => editLicense(lic)} className="text-slate-400 hover:text-indigo-600">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteLicense(lic.id)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helper Components ── */
function Field({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-500 w-16">{label}</span>
      <span className="text-slate-800 font-medium">{value || "—"}</span>
    </div>
  );
}
