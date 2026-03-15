"use client";

import { useState, useEffect } from "react";
import { X, Save, RotateCcw } from "lucide-react";
import { DEFAULT_MATERIALS, LABOR_RATES, WASTE_RATE_PER_YARD, DEFAULT_OPS_RATE, DEFAULT_COGS_RATES, type COGSRates } from "@/lib/materials";

interface PricingSettingsProps {
  open: boolean;
  onClose: () => void;
}

type MaterialOverride = { name: string; price: number };
type LaborRateOverride = {
  supervisorHourly: number;
  supervisorTaxBurden: number;
  technicianHourly: number;
  technicianTaxBurden: number;
};

export default function PricingSettings({ open, onClose }: PricingSettingsProps) {
  const [materials, setMaterials] = useState<MaterialOverride[]>(
    DEFAULT_MATERIALS.map((m) => ({ name: m.name, price: m.defaultPrice }))
  );
  const [laborRates, setLaborRates] = useState<LaborRateOverride>({
    supervisorHourly: LABOR_RATES.supervisor.hourly,
    supervisorTaxBurden: LABOR_RATES.supervisor.taxBurden,
    technicianHourly: LABOR_RATES.technician.hourly,
    technicianTaxBurden: LABOR_RATES.technician.taxBurden,
  });
  const [wasteRate, setWasteRate] = useState(WASTE_RATE_PER_YARD);
  const [opsPerHourRate, setOpsPerHourRate] = useState(DEFAULT_OPS_RATE);
  const [cogsRates, setCogsRates] = useState<COGSRates>({ ...DEFAULT_COGS_RATES });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"materials" | "labor" | "cogs">("materials");
  const [search, setSearch] = useState("");

  // Load saved settings on mount
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((settings) => {
        if (settings.materialPrices) {
          setMaterials((prev) =>
            prev.map((m) => {
              const override = settings.materialPrices?.find((o: any) => o.name === m.name);
              return override ? { ...m, price: override.price } : m;
            })
          );
        }
        if (settings.laborRates) {
          setLaborRates(settings.laborRates);
        }
        if (settings.wasteRate != null) {
          setWasteRate(settings.wasteRate);
        }
        if (settings.opsPerHourRate != null) {
          setOpsPerHourRate(parseFloat(settings.opsPerHourRate) || DEFAULT_OPS_RATE);
        }
        // Load COGS rates from cogs_* keys
        const loadedRates: Partial<COGSRates> = {};
        Object.keys(DEFAULT_COGS_RATES).forEach((key) => {
          const settingKey = `cogs_${key}`;
          if (settings[settingKey] != null) {
            (loadedRates as any)[key] = parseFloat(settings[settingKey]);
          }
        });
        if (Object.keys(loadedRates).length > 0) {
          setCogsRates((prev) => ({ ...prev, ...loadedRates }));
          // Sync labor tab state from cogs_* values
          if (loadedRates.supervisorHourly != null || loadedRates.supervisorTaxBurden != null ||
              loadedRates.technicianHourly != null || loadedRates.technicianTaxBurden != null) {
            setLaborRates((prev) => ({
              ...prev,
              ...(loadedRates.supervisorHourly != null && { supervisorHourly: loadedRates.supervisorHourly }),
              ...(loadedRates.supervisorTaxBurden != null && { supervisorTaxBurden: loadedRates.supervisorTaxBurden }),
              ...(loadedRates.technicianHourly != null && { technicianHourly: loadedRates.technicianHourly }),
              ...(loadedRates.technicianTaxBurden != null && { technicianTaxBurden: loadedRates.technicianTaxBurden }),
            }));
          }
          if (loadedRates.wasteRatePerYard != null) setWasteRate(loadedRates.wasteRatePerYard);
          if (loadedRates.opsPerHourRate != null) setOpsPerHourRate(loadedRates.opsPerHourRate);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Merge labor tab values into cogsRates for unified cogs_* storage
      const mergedRates: COGSRates = {
        ...cogsRates,
        supervisorHourly: laborRates.supervisorHourly,
        supervisorTaxBurden: laborRates.supervisorTaxBurden,
        technicianHourly: laborRates.technicianHourly,
        technicianTaxBurden: laborRates.technicianTaxBurden,
      };
      const cogsSettings: Record<string, string> = {};
      Object.entries(mergedRates).forEach(([key, value]) => {
        cogsSettings[`cogs_${key}`] = String(value);
      });
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialPrices: materials,
          laborRates,
          wasteRate,
          opsPerHourRate,
          ...cogsSettings,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Failed to save settings.");
    }
    setSaving(false);
  };

  const handleResetMaterials = () => {
    if (!confirm("Reset all material prices to defaults?")) return;
    setMaterials(DEFAULT_MATERIALS.map((m) => ({ name: m.name, price: m.defaultPrice })));
  };

  const handleResetLabor = () => {
    if (!confirm("Reset labor rates to defaults?")) return;
    setLaborRates({
      supervisorHourly: LABOR_RATES.supervisor.hourly,
      supervisorTaxBurden: LABOR_RATES.supervisor.taxBurden,
      technicianHourly: LABOR_RATES.technician.hourly,
      technicianTaxBurden: LABOR_RATES.technician.taxBurden,
    });
  };

  const updateMaterialPrice = (name: string, price: number) => {
    setMaterials((prev) => prev.map((m) => (m.name === name ? { ...m, price } : m)));
  };

  const filteredMaterials = search
    ? materials.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : materials;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pricing Settings</h2>
            <p className="text-sm text-slate-500">Adjust material prices, labor rates, and COGS defaults</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-5">
          {(["materials", "labor", "cogs"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === t
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "materials" ? "Materials" : t === "labor" ? "Labor Rates" : "COGS"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading settings...</p>
          ) : tab === "materials" ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleResetMaterials}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Defaults
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 uppercase">Material</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 uppercase w-20">Unit</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 uppercase w-28">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((mat) => {
                    const def = DEFAULT_MATERIALS.find((d) => d.name === mat.name);
                    const isChanged = def && mat.price !== def.defaultPrice;
                    return (
                      <tr key={mat.name} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-2">
                          <span className={`text-slate-700 ${isChanged ? "font-semibold" : ""}`}>{mat.name}</span>
                          {isChanged && <span className="ml-1 text-[10px] text-amber-500 font-medium">modified</span>}
                        </td>
                        <td className="py-2 px-2 text-xs text-slate-500">{def?.unit || ""}</td>
                        <td className="py-2 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400 text-xs">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={mat.price}
                              onChange={(e) => updateMaterialPrice(mat.name, parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 text-right text-sm border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : tab === "labor" ? (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleResetLabor}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Defaults
                </button>
              </div>
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Supervisor</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Hourly Rate</label>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          value={laborRates.supervisorHourly}
                          onChange={(e) => setLaborRates((p) => ({ ...p, supervisorHourly: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Tax Burden</label>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={laborRates.supervisorTaxBurden}
                          onChange={(e) => setLaborRates((p) => ({ ...p, supervisorTaxBurden: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Effective rate: ${(laborRates.supervisorHourly + laborRates.supervisorTaxBurden).toFixed(2)}/hr
                    &nbsp;·&nbsp;OT: ${(laborRates.supervisorHourly * 1.5 + laborRates.supervisorTaxBurden).toFixed(2)}/hr
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Technician</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Hourly Rate</label>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          value={laborRates.technicianHourly}
                          onChange={(e) => setLaborRates((p) => ({ ...p, technicianHourly: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Tax Burden</label>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={laborRates.technicianTaxBurden}
                          onChange={(e) => setLaborRates((p) => ({ ...p, technicianTaxBurden: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Effective rate: ${(laborRates.technicianHourly + laborRates.technicianTaxBurden).toFixed(2)}/hr
                    &nbsp;·&nbsp;OT: ${(laborRates.technicianHourly * 1.5 + laborRates.technicianTaxBurden).toFixed(2)}/hr
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Waste & Ops */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Waste Rate / cubic yard</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={cogsRates.wasteRatePerYard}
                      onChange={(e) => setCogsRates((p) => ({ ...p, wasteRatePerYard: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Operating Cost / hour</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={cogsRates.opsPerHourRate}
                      onChange={(e) => setCogsRates((p) => ({ ...p, opsPerHourRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200"></div>

              {/* Permit, Clearance, Per Diem */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Permit Cost (30-day)</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={cogsRates.permitCost}
                      onChange={(e) => setCogsRates((p) => ({ ...p, permitCost: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Clearance Cost</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={cogsRates.clearanceCost}
                      onChange={(e) => setCogsRates((p) => ({ ...p, clearanceCost: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Per Diem / person / day</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={cogsRates.perDiemRate}
                      onChange={(e) => setCogsRates((p) => ({ ...p, perDiemRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Per Diem Mile Threshold</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={cogsRates.perDiemMileThreshold}
                    onChange={(e) => setCogsRates((p) => ({ ...p, perDiemMileThreshold: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">miles from shop before per diem applies</p>
                </div>
              </div>

              <div className="border-t border-slate-200"></div>

              {/* Hauling */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Hauling Rate Standard / yd</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={cogsRates.haulingRateStandard}
                      onChange={(e) => setCogsRates((p) => ({ ...p, haulingRateStandard: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Hauling Rate West Slope / yd</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={cogsRates.haulingRateWest}
                      onChange={(e) => setCogsRates((p) => ({ ...p, haulingRateWest: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200"></div>

              {/* Vehicle & Trailer */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Vehicle Mileage Rate / mile</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cogsRates.vehicleMileageRate}
                      onChange={(e) => setCogsRates((p) => ({ ...p, vehicleMileageRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">× 2 for round trip</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Trailer Mileage Rate / mile</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cogsRates.trailerMileageRate}
                      onChange={(e) => setCogsRates((p) => ({ ...p, trailerMileageRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">× 2 for round trip</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Default Trailer Trips</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={cogsRates.trailerDefaultQty}
                    onChange={(e) => setCogsRates((p) => ({ ...p, trailerDefaultQty: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Fuel Surcharge</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cogsRates.fuelSurchargePercent}
                      onChange={(e) => setCogsRates((p) => ({ ...p, fuelSurchargePercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-slate-400 text-sm">%</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">applied to material subtotal</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
