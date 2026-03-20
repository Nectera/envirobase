"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Upload, CheckCircle, Loader2, Image as ImageIcon } from "lucide-react";

interface BrandingData {
  appName: string | null;
  companyName: string | null;
  companyShort: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  accentColor: string | null;
  supportEmail: string | null;
  companyLocation: string | null;
  state: string | null;
  domain: string | null;
  website: string | null;
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const DEFAULT_BRAND_COLOR = "#7BC143";
const DEFAULT_ACCENT_COLOR = "#0068B5";

export default function BrandingSettings() {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/branding")
      .then((r) => { if (r.ok) return r.json(); throw new Error("Failed"); })
      .then((data) => setBranding(data))
      .catch(() => setError("Failed to load branding settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!branding) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to save"); }
      const updated = await res.json();
      setBranding(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to save branding settings");
    } finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/settings/branding/logo", { method: "POST", body: formData });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Upload failed"); }
      const { logoUrl, brandColor, accentColor } = await res.json();
      setBranding((prev) => { if (!prev) return prev; const updates: Partial<BrandingData> = { logoUrl }; if (brandColor) updates.brandColor = brandColor; if (accentColor) updates.accentColor = accentColor; return { ...prev, ...updates }; });
    } catch (err: any) {
      setError(err.message || "Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateField = (field: keyof BrandingData, value: string) => {
    setBranding((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!branding) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <p className="text-sm text-slate-500">{error || "Unable to load branding settings. This feature requires an organization account."}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Company Branding</h3>
          <p className="text-xs text-slate-500">Customize how your company appears in the app</p>
        </div>
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Company Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "Uploading..." : "Upload Logo"}
            </button>
            <p className="text-xs text-slate-400 mt-1.5">PNG, JPG, SVG, or WebP. Max 5 MB.</p>
          </div>
        </div>
      </div>

      {/* Company Names */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
          <input type="text" value={branding.companyName || ""} onChange={(e) => updateField("companyName", e.target.value)} placeholder="Acme Environmental Services" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
          <p className="text-xs text-slate-400 mt-1">Full legal company name</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Short Name</label>
          <input type="text" value={branding.companyShort || ""} onChange={(e) => updateField("companyShort", e.target.value)} placeholder="Acme" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
          <p className="text-xs text-slate-400 mt-1">Displayed in the header</p>
        </div>
      </div>

      {/* App Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">App Name</label>
        <input type="text" value={branding.appName || ""} onChange={(e) => updateField("appName", e.target.value)} placeholder="EnviroBase" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
        <p className="text-xs text-slate-400 mt-1">Used in page titles and email subjects</p>
      </div>

      {/* Brand Colors */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Brand Colors</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Primary Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={branding.brandColor || DEFAULT_BRAND_COLOR} onChange={(e) => updateField("brandColor", e.target.value)} className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5" />
              <input type="text" value={branding.brandColor || DEFAULT_BRAND_COLOR} onChange={(e) => updateField("brandColor", e.target.value)} placeholder="#7BC143" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={branding.accentColor || DEFAULT_ACCENT_COLOR} onChange={(e) => updateField("accentColor", e.target.value)} className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5" />
              <input type="text" value={branding.accentColor || DEFAULT_ACCENT_COLOR} onChange={(e) => updateField("accentColor", e.target.value)} placeholder="#0068B5" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: `linear-gradient(to right, ${branding.brandColor || DEFAULT_BRAND_COLOR}, ${branding.brandColor || DEFAULT_BRAND_COLOR}, ${branding.accentColor || DEFAULT_ACCENT_COLOR})` }} />
        <p className="text-xs text-slate-400 mt-1.5">Preview of your header accent strip</p>
      </div>

      {/* Contact & Location */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Support Email</label>
          <input type="email" value={branding.supportEmail || ""} onChange={(e) => updateField("supportEmail", e.target.value)} placeholder="support@yourcompany.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
          <input type="text" value={branding.companyLocation || ""} onChange={(e) => updateField("companyLocation", e.target.value)} placeholder="Denver, CO" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
          <select value={branding.state || ""} onChange={(e) => updateField("state", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
            <option value="">Select state...</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <p className="text-xs text-slate-400 mt-1">Drives compliance regulations</p>
        </div>
      </div>

      {/* Website & Domain */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Website</label>
          <input type="url" value={branding.website || ""} onChange={(e) => updateField("website", e.target.value)} placeholder="https://yourcompany.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Custom Domain</label>
          <input type="text" value={branding.domain || ""} onChange={(e) => updateField("domain", e.target.value)} placeholder="app.yourcompany.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">{error}</div>}

      <div className="flex items-center gap-3 pt-2">
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Branding"}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Changes saved — they&apos;ll take effect on next page load.</span>}
      </div>
    </div>
  );
}
