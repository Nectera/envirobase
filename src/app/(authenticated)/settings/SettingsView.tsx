"use client";

import { useState, useEffect } from "react";
import { Plus, X, Save, Users, Shield, Award, CheckCircle, Loader2, Globe, Calculator, Star, Mail, ShieldCheck, ServerCog, CreditCard, Palette, Video, Building2 } from "lucide-react";
import SmtpSettings from "./SmtpSettings";
import BillingSettings from "./BillingSettings";
import BrandingSettings from "./BrandingSettings";
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
  const [activeTab, setActiveTab] = useState<"roles" | "positions" | "certifications" | "language" | "pricing" | "reviews" | "estimateFollowUp" | "certRequirements" | "email" | "billing" | "branding" | "meetings" | "offices">("roles");
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
  // Offices config
  const [offices, setOffices] = useState<{ value: string; label: string }[]>([]);
  const [newOfficeName, setNewOfficeName] = useState("");
  const [officesSaving, setOfficesSaving] = useState(false);
  const [officesSaved, setOfficesSaved] = useState(false);
  // Meeting platform config
  const [meetingPlatform, setMeetingPlatform] = useState<string>("google_meet");
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [meetingSaved, setMeetingSaved] = useState(false);

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
    fetch("/api/settings/meeting-platform")
      .then((r) => { if (r.ok) return r.json(); throw new Error("Failed"); })
      .then((d) => { if (d?.platform) setMeetingPlatform(d.platform); })
      .catch(() => {});
    fetch("/api/settings/offices")
      .then((r) => { if (r.ok) return r.json(); throw new Error("Failed"); })
      .then((d) => { if (d?.offices) setOffices(d.offices); })
      .catch(() => {});
  }, []);

  const tabs = [
    { key: "roles" as const, label: t("settings.roles"), icon: Shield },
    { key: "positions" as const, label: t("settings.positions"), icon: Users },
    { key: "certifications" as const, label: t("settings.certifications"), icon: Award },
    { key: "language" as const, label: t("settings.language"), icon: Globe },
    { key: "pricing" as const, label: t("settings.pricing"), icon: Calculator },
    { key: "reviews" as const, label: t("settings.googleReviews"), icon: Star },
    { key: "estimateFollowUp" as const, label: t("settings.estimateFollowUp"), icon: Mail },
    { key: "certRequirements" as const, label: t("settings.certRequirements"), icon: ShieldCheck },
    { key: "branding" as const, label: "Branding", icon: Palette },
    { key: "offices" as const, label: "Offices", icon: Building2 },
    { key: "meetings" as const, label: "Meetings", icon: Video },
    { key: "email" as const, label: "Email / SMTP", icon: ServerCog },
    { key: "billing" as const, label: "Billing", icon: CreditCard },
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
              <p className="text-xs text-slate-500">{t("settings.selectYourPreferredLanguage")}</p>
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
                  onChange={(e) => setLanguage(e.target.value as "en" | "es")}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{t("settings.english")}</p>
                  <p className="text-xs text-slate-500">{t("settings.useApplicationEnglish")}</p>
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
                  onChange={(e) => setLanguage(e.target.value as "en" | "es")}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{t("settings.spanish")}</p>
                  <p className="text-xs text-slate-500">{t("settings.useApplicationSpanish")}</p>
                </div>
                {language === "es" && <CheckCircle className="w-5 h-5 text-indigo-600" />}
              </label>

            </div>

            {/* Preview */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">{t("settings.preview")}</p>
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
              <h3 className="font-semibold text-slate-900">{t("settings.pricingTitle")}</h3>
              <p className="text-xs text-slate-500">{t("settings.pricingDescription")}</p>
            </div>
          </div>

          {/* Labor Rates Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 text-sm">{t("settings.laborRates")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.supervisorHourlyRate")}</label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.supervisorTaxBurden")}</label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.technicianHourlyRate")}</label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.technicianTaxBurden")}</label>
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
            <h4 className="font-semibold text-slate-900 text-sm">{t("settings.operatingCosts")}</h4>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.operatingCostRatePerHour")}</label>
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
            <h4 className="font-semibold text-slate-900 text-sm">{t("settings.cogsRates")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.permitCost30Day")}</label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.clearanceCost")}</label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.perDiemRatePerPersonPerDay")}</label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.perDiemMileThreshold")}</label>
                <input
                  type="number"
                  step="1"
                  value={cogsRates.perDiemMileThreshold}
                  onChange={(e) => setCogsRates({ ...cogsRates, perDiemMileThreshold: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.wasteRatePerCubicYard")}</label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.haulingRateStandard")}</label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.haulingRateWestSlope")}</label>
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
            <h4 className="font-semibold text-slate-900 text-sm">{t("settings.vehicleAndTrailer")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.vehicleMileageRate")}</label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.trailerMileageRate")}</label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.defaultTrailerTrips")}</label>
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
            <h4 className="font-semibold text-slate-900 text-sm">{t("settings.other")}</h4>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.fuelSurchargePercent")}</label>
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
              {saving ? t("settings.savingChanges") : t("settings.saveChanges")}
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
              {t("settings.nothingConfiguredYet")} {activeTab}
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
              <h3 className="font-semibold text-slate-900">{t("settings.googleReviewSettings")}</h3>
              <p className="text-xs text-slate-500">{t("settings.googleReviewDescription")}</p>
            </div>
          </div>

          {/* Locations */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">{t("settings.googleBusinessLocations")}</h4>
            <p className="text-xs text-slate-500 mb-3">{t("settings.googleBusinessLocationsDescription")}</p>
            <div className="space-y-3">
              {(reviewConfig.locations || []).map((loc: any, idx: number) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">{t("settings.locationName")}</label>
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
                    <label className="block text-xs text-slate-500 mb-1">{t("settings.googleReviewUrl")}</label>
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
                <Plus size={12} /> {t("settings.addLocation")}
              </button>
            </div>
          </div>

          {/* Auto-send settings */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">{t("settings.autoSendSettings")}</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={reviewConfig.autoSendEnabled !== false}
                  onChange={(e) => setReviewConfig({ ...reviewConfig, autoSendEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="text-sm text-slate-700">{t("settings.autoSendFeedbackSurvey")}</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{t("settings.defaultSendMethod")}</label>
                  <select
                    value={reviewConfig.defaultMethod || "both"}
                    onChange={(e) => setReviewConfig({ ...reviewConfig, defaultMethod: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="both">{t("settings.emailAndSms")}</option>
                    <option value="email">{t("settings.emailOnly")}</option>
                    <option value="sms">{t("settings.smsOnly")}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Touch Drip Sequence */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-1">{t("settings.threePointFollowUpSequence")}</h4>
            <p className="text-xs text-slate-400 mb-4">
              {t("settings.threePointFollowUpDescription")}
            </p>
            <div className="space-y-4">
              {(reviewConfig.sequence || []).map((step: any, idx: number) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {step.channel === "sms" ? t("settings.sms") : t("settings.email")}
                    </span>
                    <span className="text-xs text-slate-400">
                      {step.delayDays === 0 ? t("settings.immediately") : `${t("settings.day")} ${step.delayDays}`}
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
                      placeholder={t("settings.smsMessage")}
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
                        placeholder={t("settings.emailSubjectLine")}
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
                        placeholder={t("settings.emailBody")}
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
              {reviewConfigSaving ? t("common.saving") : t("settings.saveReviewSettings")}
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
            <h3 className="text-sm font-semibold text-slate-900 mb-1">{t("settings.estimateFollowUpEmails")}</h3>
            <p className="text-xs text-slate-500">
              {t("settings.estimateFollowUpDescription")}
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
            <span className="text-sm text-slate-700">{t("settings.autoStartFollowUpSequence")}</span>
          </label>

          {/* Sequence Editor */}
          <div>
            <h4 className="text-sm font-medium text-slate-800 mb-3">{t("settings.threePointEmailSequence")}</h4>
            <p className="text-xs text-slate-500 mb-3">
              {t("settings.emailsScheduledDayAfter")}
            </p>
            <div className="space-y-4">
              {(efConfig.sequence || []).map((step: any, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800">
                      {t("settings.email")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t("settings.day")} {step.delayDays}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">{t("settings.subject")}</label>
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
                    <label className="block text-xs text-slate-600 mb-1">{t("settings.emailBodyLabel")}</label>
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
                      {t("settings.useClientNamePlaceholder")}
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
              {efConfigSaving ? t("common.saving") : t("settings.saveFollowUpSettings")}
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
            <h3 className="text-sm font-semibold text-slate-900 mb-1">{t("settings.certRequirementsTitle")}</h3>
            <p className="text-xs text-slate-500">
              {t("settings.certRequirementsDescription")}
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
            <span className="text-sm text-slate-700">{t("settings.hardBlockUncertifiedWorkers")}</span>
          </label>

          {/* Expiring threshold */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t("settings.expiringThreshold")}</label>
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
            <h4 className="text-sm font-medium text-slate-800 mb-3">{t("settings.projectTypeToRequiredCerts")}</h4>
            <p className="text-xs text-slate-500 mb-3">
              {t("settings.projectTypeDescription")}
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
                    placeholder={t("settings.addCertificationName")}
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
              <p className="text-xs font-medium text-slate-600">{t("settings.addProjectTypeRequirement")}</p>
              <div className="flex gap-2">
                <select
                  value={newCertReqType}
                  onChange={(e) => setNewCertReqType(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs"
                >
                  <option value="">{t("settings.selectProjectType")}</option>
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
                  placeholder={t("settings.firstCertName")}
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
              {certReqSaving ? t("common.saving") : t("settings.saveCertRequirements")}
            </button>
            {certReqSaved && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <CheckCircle size={14} /> Saved!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Email / SMTP tab */}
      {/* Branding tab */}
      {activeTab === "branding" && <BrandingSettings />}

      {activeTab === "email" && <SmtpSettings />}

      {/* Offices tab */}
      {activeTab === "offices" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Office Locations</h3>
            <p className="text-xs text-slate-500 mb-3">Add your office locations. These are used for filtering the dashboard metrics and assigning workers/projects to offices.</p>
          </div>

          {/* Add new office */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newOfficeName}
              onChange={(e) => setNewOfficeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const label = newOfficeName.trim();
                  if (!label) return;
                  const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                  if (offices.some((o) => o.value === value)) return;
                  setOffices([...offices, { value, label }]);
                  setNewOfficeName("");
                }
              }}
              placeholder="e.g. Denver, Austin, etc."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={() => {
                const label = newOfficeName.trim();
                if (!label) return;
                const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                if (offices.some((o) => o.value === value)) return;
                setOffices([...offices, { value, label }]);
                setNewOfficeName("");
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {/* Office list */}
          {offices.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No offices configured yet. Add your first office above.</p>
          ) : (
            <div className="space-y-2">
              {offices.map((office) => (
                <div key={office.value} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{office.label}</span>
                    <span className="text-[10px] text-slate-400">({office.value})</span>
                  </div>
                  <button
                    onClick={() => setOffices(offices.filter((o) => o.value !== office.value))}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={async () => {
              setOfficesSaving(true);
              setOfficesSaved(false);
              try {
                await fetch("/api/settings/offices", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ offices }),
                });
                setOfficesSaved(true);
                setTimeout(() => setOfficesSaved(false), 2000);
              } catch {} finally {
                setOfficesSaving(false);
              }
            }}
            disabled={officesSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={14} />
            {officesSaving ? "Saving..." : "Save"}
          </button>
          {officesSaved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
        </div>
      )}

      {/* Meetings tab */}
      {activeTab === "meetings" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Video Meeting Platform</h3>
            <p className="text-xs text-slate-500 mb-3">Choose which platform to use when starting meetings from chat. Users must be logged into their account on the selected platform.</p>
          </div>
          <div className="space-y-2">
            {[
              { value: "google_meet", label: "Google Meet", desc: "Opens meet.google.com/new — requires Google Workspace" },
              { value: "zoom", label: "Zoom", desc: "Opens zoom.us/start — requires a Zoom account" },
              { value: "disabled", label: "Disabled", desc: "Hide the video meeting button in chat" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  meetingPlatform === opt.value
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="meetingPlatform"
                  value={opt.value}
                  checked={meetingPlatform === opt.value}
                  onChange={() => setMeetingPlatform(opt.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">{opt.label}</div>
                  <div className="text-xs text-slate-500">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <button
            onClick={async () => {
              setMeetingSaving(true);
              setMeetingSaved(false);
              try {
                await fetch("/api/settings/meeting-platform", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ platform: meetingPlatform }),
                });
                setMeetingSaved(true);
                setTimeout(() => setMeetingSaved(false), 2000);
              } catch {} finally {
                setMeetingSaving(false);
              }
            }}
            disabled={meetingSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={14} />
            {meetingSaving ? "Saving..." : "Save"}
          </button>
          {meetingSaved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
        </div>
      )}

      {/* Billing tab */}
      {activeTab === "billing" && <BillingSettings />}

      {/* Save button */}
      {(activeTab === "roles" || activeTab === "positions" || activeTab === "certifications") && (
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save size={14} />
          {saving ? t("settings.savingChanges") : t("settings.saveChanges")}
        </button>
        {saved === activeTab && (
          <span className="text-sm text-green-600 font-medium">Saved!</span>
        )}
      </div>
      )}
    </div>
  );
}
