"use client";

import { useState, useEffect } from "react";
import { Plus, X, Save, Users, Shield, Award, CheckCircle, Loader2, Globe, Calculator, Star, Mail, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";
import { logger } from "@/lib/logger";
import { DEFAULT_COGS_RATES, type COGSRates } from "@/lib/materials";

interface Props {
  initialPositions: string[];
  initialRoles: string[];
  initialCertTypes: string[];
  initialCogsRates?: Partial<COGSRates>;
}

export default function SettingsView({ initialPositions, initialRoles, initialCertTypes, initialCogsRates }: Props) {
  const { t, language, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState<"roles" | "positions" | "certifications" | "language" | "pricing" | "reviews" | "estimateFollowUp" | "certRequirements">("roles");
  const [positions, setPositions] = useState(initialPositions);
  const [roles, setRoles] = useState(initialRoles);
  const [certTypes, setCertTypes] = useState(initialCertTypes);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  // Pricing/COGS rates state
  const [cogsRates, setCogsRates] = useState<COGSRates>({ ...DEFAULT_COGS_RATES, ...initialCogsRates });
  // Google Review config state
  const [reviewConfig, setReviewConfig] = useState<any>(null);
  const [reviewConfigSaving, setReviewConfigSaving] = useState(false);
  const [reviewConfigSaved, setReviewConfigSaved] = useState(false);
  // Estimate Follow-Up config state
  const [efConfig, setEfConfig] = useState<any>(null);
  const [efConfigSaving, setEfConfigSaving] = useState(false);
  const [efConfigSaved, setEfConfigSaved] = useState(false);
  // Cert Requirements config state
  const [certReqConfig, setCertReqConfig] = useState<any>(null);
  const [certReqSaving, setCertReqSaving] = useState(false);
  const [certReqSaved, setCertReqSaved] = useState(false);
  const [newCertReqType, setNewCertReqType] = useState("");
  const [newCertReqCert, setNewCertReqCert] = useState("");

  useEffect(() => {
    fetch("/api/review-requests/config")
      .then((r) => { if (r.ok) return r.json(); throw new Error("Failed"); })
      .then((d) => { if (d && !d.error) setReviewConfig(d); })
      .catch(() => {});
    fetch("/api/estimate-follow-ups/config")
      .then((r) => { if (r.ok) return r.json(); throw new Error("Failed"); })
      .then((d) => { if (d && !d.error) setEfConfig(d); })
      .catch(() => {});
    fetch("/api/cert-requirements")
      .then((r) => { if (r.ok) return r.json(); throw new Error("Failed"); })
      .then((d) => { if (d && !d.error) setCertReqConfig(d); })
      .catch(() => {});
  }, []);

  const tabs = [
    { key: "roles" as const, label: t("settings.roles"), icon: Shield },
    { key: "positions" as const, label: t("settings.positions"), icon: Users },
    { key: "certifications" as const, label: t("settings.certifications"), icon: Award },
    { key: "language" as const, label: t("settings.language"), icon: Globe },
    { key: "pricing" as const, label: "Pricing", icon: Calculator },
    { key: "reviews" as const, label: "Google Reviews", icon: Star },
    { key: "estimateFollowUp" as const, label: "Estimate Follow-Up", icon: Mail },
    { key: "certRequirements" as const, label: "Cert Requirements", icon: ShieldCheck },
  ];

  const currentItems = activeTab === "roles" ? roles : activeTab === "positions" ? positions : certTypes;
  const setCurrentItems = activeTab === "roles" ? setRoles : activeTab === "positions" ? setPositions : setCertTypes;

  const addItem = () => {
    const val = activeTab === "roles" || activeTab === "certifications" ? newItem.trim().toUpperCase() : newItem.trim();
    if (!val || currentItems.includes(val)) return;
    setCurrentItems([...currentItems, val]);
    setNewItem("");
  };

  const removeItem = (item: string) => {
    setCurrentItems(currentItems.filter((i) => i !== item));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      if (activeTab === "roles") {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: JSON.stringify(roles) }),
        });
      } else if (activeTab === "positions") {
        await fetch("/api/settings/positions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positions }),
        });
      } else if (activeTab === "pricing") {
        // Save all COGS rates as individual settings
        const settings: Record<string, string> = {};
        Object.entries(cogsRates).forEach(([key, value]) => {
          settings[`cogs_${key}`] = String(value);
        });
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
      } else {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ certificationTypes: JSON.stringify(certTypes) }),
        });
      }
      setSaved(activeTab);
      setTimeout(() => setSaved(""), 2000);
    } catch (err) {
      logger.error("Failed to save:", { error: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const descriptions: Record<string, string> = {
    roles: t("settings.rolesDescription"),
    positions: t("settings.positionsDescription"),
    certifications: t("settings.certificationsDescription"),
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t("settings.title")}</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setNewItem(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 ${
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Language Tab */}
      {activeTab === "language" && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{t("settings.language")}</h3>
              <p className="text-xs text-slate-500">Select your preferred language</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              {/* English option */}
              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors" style={{ borderColor: language === "en" ? "#4f46e5" : undefined, backgroundColor: language === "en" ? "#eef2ff" : undefined }}>
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={language === "en"}
                  onChange={(e) => setLanguage(e.target.value as "en" | "es" | "pt")}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">English</p>
                  <p className="text-xs text-slate-500">Use the application in English</p>
                </div>
                {language === "en" && <CheckCircle className="w-5 h-5 text-indigo-600" />}
              </label>

              {/* Spanish option */}
              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors" style={{ borderColor: language === "es" ? "#4f46e5" : undefined, backgroundColor: language === "es" ? "#eef2ff" : undefined }}>
                <input
                  type="radio"
                  name="language"
                  value="es"
                  checked={language === "es"}
                  onChange={(e) => setLanguage(e.target.value as "en" | "es" | "pt")}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Español</p>
                  <p className="text-xs text-slate-500">Utilizar la aplicación en español</p>
                </div>
                {language === "es" && <CheckCircle className="w-5 h-5 text-indigo-600" />}
              </label>

              {/* Portuguese option */}
              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors" style={{ borderColor: language === "pt" ? "#4f46e5" : undefined, backgroundColor: language === "pt" ? "#eef2ff" : undefined }}>
                <input
                  type="radio"
                  name="language"
                  value="pt"
                  checked={language === "pt"}
                  onChange={(e) => setLanguage(e.target.value as "en" | "es" | "pt")}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Português</p>
                  <p className="text-xs text-slate-500">Utilizar o aplicativo em português</p>
                </div>
                {language === "pt" && <CheckCircle className="w-5 h-5 text-indigo-600" />}
              </label>
            </div>

            {/* Preview */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Preview</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">{t("sidebar.dashboard")}</p>
                  <p className="text-slate-500">{t("sidebar.projects")}</p>
                  <p className="text-slate-500">{t("sidebar.team")}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t("common.save")}</p>
                  <p className="text-slate-500">{t("common.delete")}</p>
                  <p className="text-slate-500">{t("login.signIn")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integrations have moved to the Plug-ins page */}

      {/* Pricing Tab */}
      {activeTab === "pricing" && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Pricing & COGS Rates</h3>
              <p className="text-xs text-slate-500">Configure hardcoded rates for cost calculations</p>
            </div>
          </div>

          {/* Labor Rates Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 text-sm">Labor Rates</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Supervisor Hourly Rate</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cogsRates.supervisorHourly}
                    onChange={(e) => setCogsRates({ ...cogsRates, supervisorHourly: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Supervisor Tax Burden</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cogsRates.supervisorTaxBurden}
                    onChange={(e) => setCogsRates({ ...cogsRates, supervisorTaxBurden: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Technician Hourly Rate</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cogsRates.technicianHourly}
                    onChange={(e) => setCogsRates({ ...cogsRates, technicianHourly: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Technician Tax Burden</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cogsRates.technicianTaxBurden}
                    onChange={(e) => setCogsRates({ ...cogsRates, technicianTaxBurden: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200"></div>

          {/* Operating Costs Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 text-sm">Operating Costs</h4>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Operating Cost Rate / hour</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={cogsRates.opsPerHourRate}
                  onChange={(e) => setCogsRates({ ...cogsRates, opsPerHourRate: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200"></div>

          {/* COGS Rates Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 text-sm">COGS Rates</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Permit Cost - 30 day</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="1"
                    value={cogsRates.permitCost}
                    onChange={(e) => setCogsRates({ ...cogsRates, permitCost: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Clearance Cost</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="1"
                    value={cogsRates.clearanceCost}
                    onChange={(e) => setCogsRates({ ...cogsRates, clearanceCost: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Per Diem Rate / person / day</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="1"
                    value={cogsRates.perDiemRate}
                    onChange={(e) => setCogsRates({ ...cogsRates, perDiemRate: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Per Diem Mile Threshold</label>
                <input
                  type="number"
                  step="1"
                  value={cogsRates.perDiemMileThreshold}
                  onChange={(e) => setCogsRates({ ...cogsRates, perDiemMileThreshold: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Waste Rate / cubic yard</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cogsRates.wasteRatePerYard}
                    onChange={(e) => setCogsRates({ ...cogsRates, wasteRatePerYard: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Hauling Rate Standard / yd</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cogsRates.haulingRateStandard}
                    onChange={(e) => setCogsRates({ ...cogsRates, haulingRateStandard: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Hauling Rate West Slope / yd</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cogsRates.haulingRateWest}
                    onChange={(e) => setCogsRates({ ...cogsRates, haulingRateWest: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200"></div>

          {/* Vehicle & Trailer Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 text-sm">Vehicle & Trailer</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle Mileage Rate / mile</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cogsRates.vehicleMileageRate}
                    onChange={(e) => setCogsRates({ ...cogsRates, vehicleMileageRate: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Trailer Mileage Rate / mile</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cogsRates.trailerMileageRate}
                    onChange={(e) => setCogsRates({ ...cogsRates, trailerMileageRate: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Default Trailer Trips</label>
                <input
                  type="number"
                  step="1"
                  value={cogsRates.trailerDefaultQty}
                  onChange={(e) => setCogsRates({ ...cogsRates, trailerDefaultQty: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200"></div>

          {/* Other Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 text-sm">Other</h4>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fuel Surcharge %</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={cogsRates.fuelSurchargePercent}
                  onChange={(e) => setCogsRates({ ...cogsRates, fuelSurchargePercent: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saved === "pricing" && (
              <span className="text-sm text-green-600 font-medium">Saved!</span>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {(activeTab === "roles" || activeTab === "positions" || activeTab === "certifications") && <p className="text-sm text-slate-500 mb-4">{descriptions[activeTab]}</p>}

      {/* Items list */}
      {(activeTab === "roles" || activeTab === "positions" || activeTab === "certifications") && (
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="p-4 border-b border-slate-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder={`Add new ${activeTab === "certifications" ? "certification type" : activeTab === "roles" ? "role" : "position"}...`}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addItem}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {currentItems.map((item) => (
            <div key={item} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-slate-700">{item}</span>
              <button
                onClick={() => removeItem(item)}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Remove"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {currentItems.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              No {activeTab} configured yet. Add one above.
            </div>
          )}
        </div>
      </div>
      )}

      {/* Google Reviews Config Tab */}
      {activeTab === "reviews" && reviewConfig && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Google Review Settings</h3>
              <p className="text-xs text-slate-500">Configure feedback surveys and Google review prompts</p>
            </div>
          </div>

          {/* Locations */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Google Business Locations</h4>
            <p className="text-xs text-slate-500 mb-3">Add your Google review URLs for each location. Customers with high ratings will be redirected here.</p>
            <div className="space-y-3">
              {(reviewConfig.locations || []).map((loc: any, idx: number) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Location Name</label>
                    <input
                      type="text"
                      value={loc.name}
                      onChange={(e) => {
                        const locs = [...reviewConfig.locations];
                        locs[idx] = { ...locs[idx], name: e.target.value };
                        setReviewConfig({ ...reviewConfig, locations: locs });
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Google Review URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={loc.reviewUrl || ""}
                        onChange={(e) => {
                          const locs = [...reviewConfig.locations];
                          locs[idx] = { ...locs[idx], reviewUrl: e.target.value };
                          setReviewConfig({ ...reviewConfig, locations: locs });
                        }}
                        placeholder="https://g.page/r/..."
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                      />
                      {reviewConfig.locations.length > 1 && (
                        <button
                          onClick={() => {
                            const locs = reviewConfig.locations.filter((_: any, i: number) => i !== idx);
                            setReviewConfig({ ...reviewConfig, locations: locs });
                          }}
                          className="px-2 text-red-400 hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const key = `location_${Date.now()}`;
                  setReviewConfig({
                    ...reviewConfig,
                    locations: [...(reviewConfig.locations || []), { key, name: "", reviewUrl: "" }],
                  });
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <Plus size={12} /> Add Location
              </button>
            </div>
          </div>

          {/* Auto-send settings */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Auto-Send Settings</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={reviewConfig.autoSendEnabled !== false}
                  onChange={(e) => setReviewConfig({ ...reviewConfig, autoSendEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="text-sm text-slate-700">Auto-send feedback survey when project is completed</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Default Send Method</label>
                  <select
                    value={reviewConfig.defaultMethod || "both"}
                    onChange={(e) => setReviewConfig({ ...reviewConfig, defaultMethod: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="both">Email & SMS</option>
                    <option value="email">Email Only</option>
                    <option value="sms">SMS Only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Touch Drip Sequence */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-1">3-Touch Follow-Up Sequence</h4>
            <p className="text-xs text-slate-400 mb-4">
              Optimized for maximum response: SMS first (90% read rate), email day 2, final SMS day 5.
              Sequence stops if the customer responds.
              Use {"{clientName}"} and {"{surveyUrl}"} as placeholders.
            </p>
            <div className="space-y-4">
              {(reviewConfig.sequence || []).map((step: any, idx: number) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {step.channel === "sms" ? "SMS" : "Email"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {step.delayDays === 0 ? "Immediately" : `Day ${step.delayDays}`}
                    </span>
                  </div>

                  {step.channel === "sms" ? (
                    <textarea
                      value={step.smsTemplate || ""}
                      onChange={(e) => {
                        const seq = [...(reviewConfig.sequence || [])];
                        seq[idx] = { ...seq[idx], smsTemplate: e.target.value };
                        setReviewConfig({ ...reviewConfig, sequence: seq });
                      }}
                      rows={2}
                      placeholder="SMS message..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={step.emailSubject || ""}
                        onChange={(e) => {
                          const seq = [...(reviewConfig.sequence || [])];
                          seq[idx] = { ...seq[idx], emailSubject: e.target.value };
                          setReviewConfig({ ...reviewConfig, sequence: seq });
                        }}
                        placeholder="Email subject line..."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                      />
                      <textarea
                        value={step.emailTemplate || ""}
                        onChange={(e) => {
                          const seq = [...(reviewConfig.sequence || [])];
                          seq[idx] = { ...seq[idx], emailTemplate: e.target.value };
                          setReviewConfig({ ...reviewConfig, sequence: seq });
                        }}
                        rows={3}
                        placeholder="Email body..."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={async () => {
                setReviewConfigSaving(true);
                setReviewConfigSaved(false);
                try {
                  const res = await fetch("/api/review-requests/config", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(reviewConfig),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    alert(err.error || `Save failed (${res.status})`);
                    return;
                  }
                  const saved = await res.json();
                  setReviewConfig(saved);
                  setReviewConfigSaved(true);
                  setTimeout(() => setReviewConfigSaved(false), 3000);
                } catch {
                  alert("Failed to save review config");
                } finally {
                  setReviewConfigSaving(false);
                }
              }}
              disabled={reviewConfigSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {reviewConfigSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {reviewConfigSaving ? "Saving..." : "Save Review Settings"}
            </button>
            {reviewConfigSaved && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <CheckCircle size={14} /> Saved!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Estimate Follow-Up Tab */}
      {activeTab === "estimateFollowUp" && efConfig && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Estimate Follow-Up Emails</h3>
            <p className="text-xs text-slate-500">
              Automated email sequence sent after an estimate is marked as &quot;Sent&quot;.
              Stops automatically if the estimate is approved or rejected.
            </p>
          </div>

          {/* Enable toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={efConfig.enabled !== false}
              onChange={(e) => setEfConfig({ ...efConfig, enabled: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Auto-start follow-up sequence when estimate is sent</span>
          </label>

          {/* Sequence Editor */}
          <div>
            <h4 className="text-sm font-medium text-slate-800 mb-3">3-Touch Email Sequence</h4>
            <p className="text-xs text-slate-500 mb-3">
              Emails are sent on the configured day after the estimate is sent. The sequence stops if the client responds (approves/rejects).
            </p>
            <div className="space-y-4">
              {(efConfig.sequence || []).map((step: any, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800">
                      Email
                    </span>
                    <span className="text-xs text-slate-500">
                      Day {step.delayDays}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Subject</label>
                    <input
                      type="text"
                      value={step.subject || ""}
                      onChange={(e) => {
                        const seq = [...(efConfig.sequence || [])];
                        seq[idx] = { ...seq[idx], subject: e.target.value };
                        setEfConfig({ ...efConfig, sequence: seq });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Email Body</label>
                    <textarea
                      value={step.template || ""}
                      onChange={(e) => {
                        const seq = [...(efConfig.sequence || [])];
                        seq[idx] = { ...seq[idx], template: e.target.value };
                        setEfConfig({ ...efConfig, sequence: seq });
                      }}
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Use {"{clientName}"} as a placeholder for the client&apos;s name.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={async () => {
                setEfConfigSaving(true);
                setEfConfigSaved(false);
                try {
                  const res = await fetch("/api/estimate-follow-ups/config", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(efConfig),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    alert(err.error || `Save failed (${res.status})`);
                    return;
                  }
                  const saved = await res.json();
                  setEfConfig(saved);
                  setEfConfigSaved(true);
                  setTimeout(() => setEfConfigSaved(false), 3000);
                } catch {
                  alert("Failed to save estimate follow-up config");
                } finally {
                  setEfConfigSaving(false);
                }
              }}
              disabled={efConfigSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {efConfigSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {efConfigSaving ? "Saving..." : "Save Follow-Up Settings"}
            </button>
            {efConfigSaved && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <CheckCircle size={14} /> Saved!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Cert Requirements Tab */}
      {activeTab === "certRequirements" && certReqConfig && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Certification Requirements</h3>
            <p className="text-xs text-slate-500">
              Map project types to required certifications. Workers missing required certs will be blocked from scheduling.
            </p>
          </div>

          {/* Enforce toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={certReqConfig.enforceOnScheduling !== false}
              onChange={(e) => setCertReqConfig({ ...certReqConfig, enforceOnScheduling: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Hard-block uncertified workers from being scheduled</span>
          </label>

          {/* Expiring threshold */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Expiring Soon Threshold (days before expiry)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={certReqConfig.expiringThresholdDays || 30}
              onChange={(e) => setCertReqConfig({ ...certReqConfig, expiringThresholdDays: parseInt(e.target.value) || 30 })}
              className="w-32 px-3 py-2 border border-slate-200 rounded-md text-sm"
            />
          </div>

          {/* Requirements mapping */}
          <div>
            <h4 className="text-sm font-medium text-slate-800 mb-3">Project Type → Required Certs</h4>
            <p className="text-xs text-slate-500 mb-3">
              For each project type, list the certifications a worker must hold to be scheduled on that type of project.
            </p>

            {Object.entries(certReqConfig.requirements || {}).map(([projectType, certs]: [string, any]) => (
              <div key={projectType} className="border border-slate-200 rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-800">{projectType}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const reqs = { ...certReqConfig.requirements };
                      delete reqs[projectType];
                      setCertReqConfig({ ...certReqConfig, requirements: reqs });
                    }}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(certs as string[]).map((cert: string, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {cert}
                      <button
                        type="button"
                        onClick={() => {
                          const reqs = { ...certReqConfig.requirements };
                          reqs[projectType] = (reqs[projectType] as string[]).filter((_: string, i: number) => i !== idx);
                          if (reqs[projectType].length === 0) delete reqs[projectType];
                          setCertReqConfig({ ...certReqConfig, requirements: reqs });
                        }}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                {/* Add cert to this project type */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add certification name..."
                    className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (!val) return;
                        const reqs = { ...certReqConfig.requirements };
                        if (!(reqs[projectType] as string[]).includes(val)) {
                          reqs[projectType] = [...(reqs[projectType] as string[]), val];
                          setCertReqConfig({ ...certReqConfig, requirements: reqs });
                        }
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Add new project type mapping */}
            <div className="border border-dashed border-slate-300 rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-slate-600">Add Project Type Requirement</p>
              <div className="flex gap-2">
                <select
                  value={newCertReqType}
                  onChange={(e) => setNewCertReqType(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs"
                >
                  <option value="">Select project type...</option>
                  {["ASBESTOS", "LEAD", "METH", "MOLD", "SELECT_DEMO", "REBUILD"].filter(
                    (t) => !certReqConfig.requirements?.[t]
                  ).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newCertReqCert}
                  onChange={(e) => setNewCertReqCert(e.target.value)}
                  placeholder="First cert name..."
                  className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCertReqType || !newCertReqCert.trim()) return;
                    const reqs = { ...certReqConfig.requirements };
                    reqs[newCertReqType] = [newCertReqCert.trim()];
                    setCertReqConfig({ ...certReqConfig, requirements: reqs });
                    setNewCertReqType("");
                    setNewCertReqCert("");
                  }}
                  disabled={!newCertReqType || !newCertReqCert.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={async () => {
                setCertReqSaving(true);
                setCertReqSaved(false);
                try {
                  const res = await fetch("/api/cert-requirements", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(certReqConfig),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    alert(err.error || `Save failed (${res.status})`);
                    return;
                  }
                  const saved = await res.json();
                  setCertReqConfig(saved);
                  setCertReqSaved(true);
                  setTimeout(() => setCertReqSaved(false), 3000);
                } catch {
                  alert("Failed to save cert requirements config");
                } finally {
                  setCertReqSaving(false);
                }
              }}
              disabled={certReqSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {certReqSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {certReqSaving ? "Saving..." : "Save Cert Requirements"}
            </button>
            {certReqSaved && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <CheckCircle size={14} /> Saved!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Save button */}
      {(activeTab === "roles" || activeTab === "positions" || activeTab === "certifications") && (
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved === activeTab && (
          <span className="text-sm text-green-600 font-medium">Saved!</span>
        )}
      </div>
      )}
    </div>
  );
}
