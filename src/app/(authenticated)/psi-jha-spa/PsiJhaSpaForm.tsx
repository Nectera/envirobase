"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronUp, ChevronDown, AlertTriangle, Plus, Trash2, Shield, Save, Send,
  Cloud, MapPin, Loader2, RefreshCw,
} from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import {
  ENVIRONMENT_HAZARDS, ERGONOMICS_HAZARDS, HEIGHT_HAZARDS, ACTIVITY_HAZARDS,
  ACCESS_EGRESS_HAZARDS, PERSONAL_LIMITATIONS, PPE_REQUIREMENTS, RISK_MATRIX,
} from "@/lib/psi-hazards";

type TaskStep = { step: string; hazard: string; control: string; riskRating: number };

function Section({ title, children, defaultOpen = true, badge }: { title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3 text-left border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">{title}{badge}</span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function ChecklistGroup({ title, items, checked, onChange }: {
  title: string;
  items: { key: string; label: string }[];
  checked: string[];
  onChange: (keys: string[]) => void;
}) {
  function toggle(key: string) {
    onChange(checked.includes(key) ? checked.filter((k) => k !== key) : [...checked, key]);
  }
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">{title}</h4>
      <div className="space-y-1">
        {items.map((item) => (
          <label key={item.key} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={checked.includes(item.key)}
              onChange={() => toggle(item.key)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-slate-700">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function PsiJhaSpaForm({ presetProjectId }: { presetProjectId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Job Info
  const [projectId, setProjectId] = useState(presetProjectId || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
  const [jobNumber, setJobNumber] = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  const [taskLocation, setTaskLocation] = useState("");
  const [musterPoint, setMusterPoint] = useState("");
  const [jobSiteAddress, setJobSiteAddress] = useState("");
  const [nearestHospital, setNearestHospital] = useState("");
  const [nearestHospitalAddress, setNearestHospitalAddress] = useState("");

  // Location lookup state
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [lookupError, setLookupError] = useState("");

  // Hazard checklists
  const [environmentHazards, setEnvironmentHazards] = useState<string[]>([]);
  const [ergonomicsHazards, setErgonomicsHazards] = useState<string[]>([]);
  const [heightHazards, setHeightHazards] = useState<string[]>([]);
  const [activityHazards, setActivityHazards] = useState<string[]>([]);
  const [accessEgressHazards, setAccessEgressHazards] = useState<string[]>([]);
  const [personalLimitationsHazards, setPersonalLimitationsHazards] = useState<string[]>([]);
  const [ppeRequirements, setPpeRequirements] = useState<string[]>([]);
  const [otherHazards, setOtherHazards] = useState("");

  // Task Steps
  const [taskSteps, setTaskSteps] = useState<TaskStep[]>([
    { step: "", hazard: "", control: "", riskRating: 1 },
  ]);

  // Weather
  const [weatherCurrentTemp, setWeatherCurrentTemp] = useState("");
  const [weatherCurrentWind, setWeatherCurrentWind] = useState("");
  const [weatherCurrentCondition, setWeatherCurrentCondition] = useState("");
  const [weatherCurrentHumidity, setWeatherCurrentHumidity] = useState("");
  const [weatherCurrentHeatIndex, setWeatherCurrentHeatIndex] = useState("");
  const [weatherForecastTemp, setWeatherForecastTemp] = useState("");
  const [weatherForecastWind, setWeatherForecastWind] = useState("");
  const [weatherForecastCondition, setWeatherForecastCondition] = useState("");
  const [weatherForecastHumidity, setWeatherForecastHumidity] = useState("");
  const [weatherForecastHeatIndex, setWeatherForecastHeatIndex] = useState("");
  const [reviewedWeather, setReviewedWeather] = useState(false);
  const [reviewedRoadConditions, setReviewedRoadConditions] = useState(false);
  const [reviewedOshaHeatIndex, setReviewedOshaHeatIndex] = useState(false);

  // Sign-off
  const [supervisorName, setSupervisorName] = useState("");
  const [taskDescriptionAdequate, setTaskDescriptionAdequate] = useState(true);
  const [hazardIdentificationAdequate, setHazardIdentificationAdequate] = useState(true);
  const [reviewedByLead, setReviewedByLead] = useState(false);
  const [comments, setComments] = useState("");
  const [evacuationPlan, setEvacuationPlan] = useState("");

  // Projects list
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then(setProjects);
  }, []);

  // Carry-forward
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/psi-jha-spa/carry-forward?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.jobSiteAddress) setJobSiteAddress(data.jobSiteAddress);
        if (data.permitNumber) setPermitNumber(data.permitNumber);
        if (data.hasHistory) {
          if (data.jobNumber) setJobNumber(data.jobNumber);
          if (data.taskLocation) setTaskLocation(data.taskLocation);
          if (data.musterPoint) setMusterPoint(data.musterPoint);
          if (data.nearestHospital) setNearestHospital(data.nearestHospital);
          if (data.nearestHospitalAddress) setNearestHospitalAddress(data.nearestHospitalAddress);
          if (data.evacuationPlan) setEvacuationPlan(data.evacuationPlan);
          if (data.environmentHazards) setEnvironmentHazards(data.environmentHazards);
          if (data.ergonomicsHazards) setErgonomicsHazards(data.ergonomicsHazards);
          if (data.heightHazards) setHeightHazards(data.heightHazards);
          if (data.activityHazards) setActivityHazards(data.activityHazards);
          if (data.accessEgressHazards) setAccessEgressHazards(data.accessEgressHazards);
          if (data.personalLimitationsHazards) setPersonalLimitationsHazards(data.personalLimitationsHazards);
          if (data.ppeRequirements) setPpeRequirements(data.ppeRequirements);
          if (data.taskSteps?.length) setTaskSteps(data.taskSteps);
        }
      });
  }, [projectId]);

  // Auto-fetch weather + hospital when address is populated from carry-forward or project selection
  useEffect(() => {
    if (jobSiteAddress && jobSiteAddress.length > 10 && !lookupDone) {
      fetchLocationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobSiteAddress]);

  async function fetchLocationData() {
    if (!jobSiteAddress || jobSiteAddress.length < 5) {
      setLookupError("Enter a job site address first");
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    try {
      const res = await fetch(`/api/location-lookup?address=${encodeURIComponent(jobSiteAddress)}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || "Lookup failed");
        return;
      }

      // Fill weather fields
      if (data.weather) {
        setWeatherCurrentTemp(data.weather.currentTemp);
        setWeatherCurrentWind(data.weather.currentWind);
        setWeatherCurrentCondition(data.weather.currentCondition);
        setWeatherCurrentHumidity(data.weather.currentHumidity);
        setWeatherCurrentHeatIndex(data.weather.currentHeatIndex);
        setWeatherForecastTemp(data.weather.forecastTemp);
        setWeatherForecastWind(data.weather.forecastWind);
        setWeatherForecastCondition(data.weather.forecastCondition);
        setWeatherForecastHumidity(data.weather.forecastHumidity);
        setWeatherForecastHeatIndex(data.weather.forecastHeatIndex);
      }

      // Fill hospital fields (only if not already populated from carry-forward)
      if (data.hospital?.name && !nearestHospital) {
        setNearestHospital(data.hospital.name);
      }
      if (data.hospital?.address && !nearestHospitalAddress) {
        setNearestHospitalAddress(data.hospital.address);
      }

      setLookupDone(true);
    } catch {
      setLookupError("Network error during lookup");
    } finally {
      setLookupLoading(false);
    }
  }

  function addTaskStep() {
    setTaskSteps([...taskSteps, { step: "", hazard: "", control: "", riskRating: 1 }]);
  }

  function updateTaskStep(idx: number, field: keyof TaskStep, value: any) {
    const updated = [...taskSteps];
    (updated[idx] as any)[field] = value;
    setTaskSteps(updated);
  }

  function removeTaskStep(idx: number) {
    if (taskSteps.length <= 1) return;
    setTaskSteps(taskSteps.filter((_, i) => i !== idx));
  }

  function getRiskColor(rating: number) {
    if (rating >= 8) return "bg-red-600 text-white";
    if (rating >= 6) return "bg-orange-500 text-white";
    if (rating === 5) return "bg-yellow-400 text-black";
    return "bg-green-500 text-white";
  }

  async function handleSubmit(status: string) {
    if (!projectId) { setError("Please select a project"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/psi-jha-spa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId, date, time, jobNumber, permitNumber, taskLocation, musterPoint,
          jobSiteAddress, nearestHospital, nearestHospitalAddress,
          environmentHazards, ergonomicsHazards, heightHazards, activityHazards,
          accessEgressHazards, personalLimitationsHazards, ppeRequirements, otherHazards,
          taskSteps: taskSteps.filter((s) => s.step.trim()),
          weatherCurrentTemp, weatherCurrentWind, weatherCurrentCondition, weatherCurrentHumidity,
          weatherCurrentHeatIndex, weatherForecastTemp, weatherForecastWind, weatherForecastCondition,
          weatherForecastHumidity, weatherForecastHeatIndex,
          reviewedWeather, reviewedRoadConditions, reviewedOshaHeatIndex,
          supervisorName, supervisorVerified: status === "submitted",
          supervisorTimestamp: status === "submitted" ? new Date().toISOString() : "",
          taskDescriptionAdequate, hazardIdentificationAdequate, reviewedByLead,
          comments, evacuationPlan, status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      if (presetProjectId) {
        router.push(`/projects/${presetProjectId}`);
      } else {
        router.push("/psi-jha-spa");
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Job Information */}
      <Section title="Job Information">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {!presetProjectId && (
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="">Select project…</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Job No. / Permit No.</label>
            <input type="text" value={jobNumber} onChange={(e) => setJobNumber(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Job number" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Task Location</label>
            <input type="text" value={taskLocation} onChange={(e) => setTaskLocation(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Task location" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Muster / Meeting Point</label>
            <input type="text" value={musterPoint} onChange={(e) => setMusterPoint(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Trailer" />
          </div>

          {/* Job Site Address with auto-lookup trigger */}
          <div className="sm:col-span-3">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Job Site Address</label>
            <div className="flex gap-2">
              <AddressAutocomplete
                value={jobSiteAddress}
                onChange={(val) => { setJobSiteAddress(val); setLookupDone(false); }}
                onSelect={(result) => { setJobSiteAddress(result.fullAddress); setLookupDone(false); }}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Full address — weather & hospital will auto-fill"
              />
              <button
                type="button"
                onClick={fetchLocationData}
                disabled={lookupLoading || !jobSiteAddress}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {lookupLoading ? <Loader2 size={14} className="animate-spin" /> : lookupDone ? <RefreshCw size={14} /> : <MapPin size={14} />}
                {lookupLoading ? "Looking up…" : lookupDone ? "Refresh" : "Auto-Fill Weather & Hospital"}
              </button>
            </div>
            {lookupError && <p className="text-xs text-red-500 mt-1">{lookupError}</p>}
            {lookupDone && !lookupError && <p className="text-xs text-green-600 mt-1">Weather and hospital info populated from job site location</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
              Nearest Hospital
              {lookupDone && <span className="text-[10px] text-green-600 font-normal">(auto)</span>}
            </label>
            <input type="text" value={nearestHospital} onChange={(e) => setNearestHospital(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
              Nearest Hospital Address
              {lookupDone && <span className="text-[10px] text-green-600 font-normal">(auto)</span>}
            </label>
            <AddressAutocomplete
              value={nearestHospitalAddress}
              onChange={(val) => setNearestHospitalAddress(val)}
              onSelect={(result) => setNearestHospitalAddress(result.fullAddress)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Hospital address"
            />
          </div>
        </div>
      </Section>

      {/* Hazard Assessment */}
      <Section title="Hazard Assessment">
        <p className="text-xs text-slate-500 mb-4">Review these items with the crew at the site of the task and check the blocks that apply to the work.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-5">
            <ChecklistGroup title="Hazards for Environment" items={ENVIRONMENT_HAZARDS} checked={environmentHazards} onChange={setEnvironmentHazards} />
            <ChecklistGroup title="Ergonomics / Material Handling" items={ERGONOMICS_HAZARDS} checked={ergonomicsHazards} onChange={setErgonomicsHazards} />
            <ChecklistGroup title="Work at Height Hazards" items={HEIGHT_HAZARDS} checked={heightHazards} onChange={setHeightHazards} />
          </div>
          <div className="space-y-5">
            <ChecklistGroup title="Activity Hazards" items={ACTIVITY_HAZARDS} checked={activityHazards} onChange={setActivityHazards} />
            <ChecklistGroup title="Access / Egress Hazards" items={ACCESS_EGRESS_HAZARDS} checked={accessEgressHazards} onChange={setAccessEgressHazards} />
          </div>
          <div className="space-y-5">
            <ChecklistGroup title="Personal Limitations / Hazards" items={PERSONAL_LIMITATIONS} checked={personalLimitationsHazards} onChange={setPersonalLimitationsHazards} />
            <ChecklistGroup title="PPE Requirements" items={PPE_REQUIREMENTS} checked={ppeRequirements} onChange={setPpeRequirements} />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Other Hazards</label>
          <textarea value={otherHazards} onChange={(e) => setOtherHazards(e.target.value)}
            rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Describe any other hazards…" />
        </div>
      </Section>

      {/* Task Steps / JHA */}
      <Section title="Task Steps & Hazard Controls (JHA)">
        <div className="mb-3">
          <div className="flex gap-2 text-xs font-medium text-slate-500 px-1 mb-2">
            <div className="flex-[2]">Task Step</div>
            <div className="flex-[2]">Hazard</div>
            <div className="flex-[2]">Control</div>
            <div className="w-20 text-center">Risk</div>
            <div className="w-8" />
          </div>
          <div className="space-y-2">
            {taskSteps.map((step, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <textarea value={step.step} onChange={(e) => updateTaskStep(idx, "step", e.target.value)}
                  rows={2} className="flex-[2] border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. Load Out" />
                <textarea value={step.hazard} onChange={(e) => updateTaskStep(idx, "hazard", e.target.value)}
                  rows={2} className="flex-[2] border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="Hazards for this step" />
                <textarea value={step.control} onChange={(e) => updateTaskStep(idx, "control", e.target.value)}
                  rows={2} className="flex-[2] border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="Control measures" />
                <div className="w-20 flex flex-col items-center gap-1">
                  <select value={step.riskRating} onChange={(e) => updateTaskStep(idx, "riskRating", parseInt(e.target.value))}
                    className={`w-16 text-center border rounded px-1 py-1.5 text-sm font-bold ${getRiskColor(step.riskRating)}`}>
                    {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <button onClick={() => removeTaskStep(idx)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 mt-1"
                  disabled={taskSteps.length <= 1}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <button onClick={addTaskStep}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          <Plus size={14} /> Add Task Step
        </button>

        {/* Risk Matrix Reference */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <h4 className="text-xs font-semibold text-slate-600 mb-2">Risk Matrix Reference</h4>
          <div className="flex gap-3 text-[10px] font-semibold">
            {RISK_MATRIX.outcomes.map((o) => (
              <span key={o.label} className={`px-2 py-1 rounded ${o.color}`}>{o.label} {o.range}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* Weather */}
      <Section title="Weather" badge={
        lookupDone ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Auto-filled</span> : null
      }>
        {/* Refresh button */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-slate-500">Current conditions and daily forecast for the job site.</p>
          <button
            type="button"
            onClick={fetchLocationData}
            disabled={lookupLoading || !jobSiteAddress}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 disabled:opacity-40"
          >
            {lookupLoading ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />}
            Refresh Weather
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-3">Current</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 block">Temperature</label>
                <input type="text" value={weatherCurrentTemp} onChange={(e) => setWeatherCurrentTemp(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. 63°F" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">Wind</label>
                <input type="text" value={weatherCurrentWind} onChange={(e) => setWeatherCurrentWind(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. 16mph W" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">Conditions</label>
                <input type="text" value={weatherCurrentCondition} onChange={(e) => setWeatherCurrentCondition(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. Clear Sky" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">Humidity</label>
                <input type="text" value={weatherCurrentHumidity} onChange={(e) => setWeatherCurrentHumidity(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. 29%" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">Heat Index</label>
                <input type="text" value={weatherCurrentHeatIndex} onChange={(e) => setWeatherCurrentHeatIndex(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. 60°F" />
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-3">Forecast</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 block">Temperature</label>
                <input type="text" value={weatherForecastTemp} onChange={(e) => setWeatherForecastTemp(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. 42°F – 69°F" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">Wind</label>
                <input type="text" value={weatherForecastWind} onChange={(e) => setWeatherForecastWind(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. 24mph W" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">Conditions</label>
                <input type="text" value={weatherForecastCondition} onChange={(e) => setWeatherForecastCondition(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. Overcast" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">Humidity</label>
                <input type="text" value={weatherForecastHumidity} onChange={(e) => setWeatherForecastHumidity(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. 20%" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">Heat Index</label>
                <input type="text" value={weatherForecastHeatIndex} onChange={(e) => setWeatherForecastHeatIndex(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. 67°F" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[
            { label: "1. I have reviewed the weather conditions with the crew?", value: reviewedWeather, set: setReviewedWeather },
            { label: "2. I have reviewed the road conditions with the crew?", value: reviewedRoadConditions, set: setReviewedRoadConditions },
            { label: "3. I have reviewed the OSHA Heat Index?", value: reviewedOshaHeatIndex, set: setReviewedOshaHeatIndex },
          ].map((q) => (
            <label key={q.label} className="flex items-center gap-3 py-1 text-sm cursor-pointer">
              <input type="checkbox" checked={q.value} onChange={() => q.set(!q.value)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
              <span className="text-slate-700">{q.label}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Review & Sign-off */}
      <Section title="Review & Sign-off">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Supervisor Name</label>
              <input type="text" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex gap-6">
            {[
              { label: "1. Task Description", value: taskDescriptionAdequate, set: setTaskDescriptionAdequate },
              { label: "2. Hazard Identification", value: hazardIdentificationAdequate, set: setHazardIdentificationAdequate },
              { label: "6. Reviewed / Signed by PSI/JHA Lead", value: reviewedByLead, set: setReviewedByLead },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-sm text-slate-700">{item.label}</span>
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" checked={item.value === true} onChange={() => item.set(true)} name={item.label} />
                  <span className="text-green-700">Adequate</span>
                </label>
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" checked={item.value === false} onChange={() => item.set(false)} name={item.label} />
                  <span className="text-red-600">Inadequate</span>
                </label>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Comments</label>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)}
              rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Evacuation Plan</label>
            <textarea value={evacuationPlan} onChange={(e) => setEvacuationPlan(e.target.value)}
              rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Exit from the house and meet on the street." />
          </div>
        </div>
      </Section>

      {/* Actions */}
      <div className="flex gap-3 justify-end pb-8">
        <button onClick={() => handleSubmit("draft")} disabled={loading}
          className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2">
          <Save size={16} /> Save Draft
        </button>
        <button onClick={() => handleSubmit("submitted")} disabled={loading}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2">
          <Send size={16} /> Submit
        </button>
      </div>
    </div>
  );
}
