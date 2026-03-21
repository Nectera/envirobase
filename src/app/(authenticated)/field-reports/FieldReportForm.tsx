"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Send, ChevronDown, ChevronUp, Camera, X, AlertTriangle, Info, Upload } from "lucide-react";

type Project = {
  id: string;
  name: string;
  type: string;
  address: string;
  client: string;
};

type PhotoEntry = { filename: string; caption: string; dataUrl?: string; url?: string };

type FormData = {
  projectId: string;
  date: string;
  supervisorName: string;
  projectManagerName: string;
  // Weather
  weatherCurrentTemp: string;
  weatherCurrentWind: string;
  weatherCurrentCondition: string;
  weatherCurrentHumidity: string;
  weatherCurrentHeatIndex: string;
  // Scope
  scopeReceived: boolean;
  scopeDate: string;
  scopeDescription: string;
  workAreaLocations: string[];
  // Timeline (under scope)
  estimatedCompletionDate: string;
  daysRemaining: string;
  estimatedHoursTotal: string;
  // Work
  workCompletedToday: string;
  // End of Shift
  shiftReview: string;
  incident: boolean;
  incidentDetails: string;
  stopWork: boolean;
  stopWorkDetails: string;
  // Goals
  goalsForTomorrow: string;
  goalsForWeek: string;
  // Notes
  projectNotes: string;
  meetingLog: string;
  visitors: string;
  // Equipment & Monitoring
  negativeAirMachineCount: string;
  equipmentMalfunctions: string;
  negativeAirEstablished: boolean;
  manometerPhoto: string;
  // Asbestos in work area
  asbestosInWorkArea: string;
  // Photos
  photos: PhotoEntry[];
};

/** Resize an image file to max dimensions and return a JPEG data URL */
function resizeImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
        if (h > maxHeight) { w = (w * maxHeight) / h; h = maxHeight; }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w);
        canvas.height = Math.round(h);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas context failed")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const defaultForm: FormData = {
  projectId: "",
  date: new Date().toISOString().split("T")[0],
  supervisorName: "",
  projectManagerName: "",
  weatherCurrentTemp: "",
  weatherCurrentWind: "",
  weatherCurrentCondition: "",
  weatherCurrentHumidity: "",
  weatherCurrentHeatIndex: "",
  scopeReceived: false,
  scopeDate: "",
  scopeDescription: "",
  workAreaLocations: [],
  estimatedCompletionDate: "",
  daysRemaining: "",
  estimatedHoursTotal: "",
  workCompletedToday: "",
  shiftReview: "",
  incident: false,
  incidentDetails: "",
  stopWork: false,
  stopWorkDetails: "",
  goalsForTomorrow: "",
  goalsForWeek: "",
  projectNotes: "",
  meetingLog: "",
  visitors: "",
  negativeAirMachineCount: "",
  equipmentMalfunctions: "",
  negativeAirEstablished: false,
  manometerPhoto: "",
  asbestosInWorkArea: "",
  photos: [],
};

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left font-semibold text-sm text-slate-800 transition"
      >
        {title}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
    />
  );
}

function TextArea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
    />
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <div
        className={`w-9 h-5 rounded-full transition-colors relative ${checked ? "bg-indigo-600" : "bg-slate-300"}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="text-slate-700">{label}</span>
    </label>
  );
}

export default function FieldReportForm({
  initialData,
  reportId,
  presetProjectId,
}: {
  initialData?: any;
  reportId?: string;
  presetProjectId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialData ? { ...defaultForm, ...initialData } : defaultForm);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [workAreaInput, setWorkAreaInput] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [carryForwardLoaded, setCarryForwardLoaded] = useState(false);
  const [carryForwardInfo, setCarryForwardInfo] = useState<{ hasHistory: boolean; previousGoalsForTomorrow?: string } | null>(null);

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then(setProjects);
  }, []);

  const applyCarryForward = (cf: any, pid?: string) => {
    if (cf.hasHistory && cf.data) {
      setCarryForwardInfo({ hasHistory: true, previousGoalsForTomorrow: cf.data.previousGoalsForTomorrow });
      setForm((prev) => ({
        ...prev,
        ...(pid ? { projectId: pid } : {}),
        supervisorName: cf.data.supervisorName || prev.supervisorName,
        projectManagerName: cf.data.projectManagerName || prev.projectManagerName,
        scopeReceived: cf.data.scopeReceived ?? prev.scopeReceived,
        scopeDate: cf.data.scopeDate || prev.scopeDate,
        scopeDescription: cf.data.scopeDescription || prev.scopeDescription,
        workAreaLocations: cf.data.workAreaLocations?.length ? cf.data.workAreaLocations : prev.workAreaLocations,
        goalsForWeek: cf.data.goalsForWeek || prev.goalsForWeek,
        negativeAirMachineCount: cf.data.negativeAirMachineCount || prev.negativeAirMachineCount,
        negativeAirEstablished: cf.data.negativeAirEstablished ?? prev.negativeAirEstablished,
        asbestosInWorkArea: cf.data.asbestosInWorkArea || prev.asbestosInWorkArea,
        estimatedCompletionDate: cf.data.estimatedCompletionDate || prev.estimatedCompletionDate,
        estimatedHoursTotal: cf.data.estimatedHoursTotal || prev.estimatedHoursTotal,
        daysRemaining: cf.data.daysRemaining || prev.daysRemaining,
      }));
    } else {
      setCarryForwardInfo({ hasHistory: false });
      // Even without history, apply project-level defaults (e.g. PM name)
      if (cf.data) {
        setForm((prev) => ({
          ...prev,
          ...(pid ? { projectId: pid } : {}),
          projectManagerName: cf.data.projectManagerName || prev.projectManagerName,
        }));
      }
    }
  };

  useEffect(() => {
    if (presetProjectId && !reportId && !carryForwardLoaded) {
      setCarryForwardLoaded(true);
      update("projectId", presetProjectId);
      fetch(`/api/field-reports/carry-forward?projectId=${presetProjectId}`)
        .then((r) => r.json())
        .then((cf) => applyCarryForward(cf, presetProjectId));
    }
  }, [presetProjectId, reportId, carryForwardLoaded]);

  const loadCarryForward = (projectId: string) => {
    if (!projectId || reportId) return;
    fetch(`/api/field-reports/carry-forward?projectId=${projectId}`)
      .then((r) => r.json())
      .then((cf) => applyCarryForward(cf));
  };

  useEffect(() => {
    if (form.projectId && projects.length) {
      setSelectedProject(projects.find((p) => p.id === form.projectId) || null);
    }
  }, [form.projectId, projects]);

  // Auto-fetch weather when project is selected (using project address)
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherFetched, setWeatherFetched] = useState(false);
  useEffect(() => {
    if (selectedProject?.address && !weatherFetched && !reportId) {
      setWeatherLoading(true);
      fetch(`/api/location-lookup?address=${encodeURIComponent(selectedProject.address)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.weather) {
            setForm((prev) => ({
              ...prev,
              weatherCurrentTemp: data.weather.currentTemp || "",
              weatherCurrentWind: data.weather.currentWind || "",
              weatherCurrentCondition: data.weather.currentCondition || "",
              weatherCurrentHumidity: data.weather.currentHumidity || "",
              weatherCurrentHeatIndex: data.weather.currentHeatIndex || "",
            }));
          }
          setWeatherFetched(true);
        })
        .catch(() => {})
        .finally(() => setWeatherLoading(false));
    }
  }, [selectedProject, weatherFetched, reportId]);

  const update = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addWorkArea = () => {
    if (workAreaInput.trim()) {
      update("workAreaLocations", [...form.workAreaLocations, workAreaInput.trim()]);
      setWorkAreaInput("");
    }
  };

  const removeWorkArea = (i: number) => {
    update("workAreaLocations", form.workAreaLocations.filter((_, idx) => idx !== i));
  };

  /** Upload a single base64 photo to Supabase, return the public URL */
  const uploadPhotoToStorage = async (photo: PhotoEntry, rid: string): Promise<PhotoEntry> => {
    // Already uploaded (has URL, no base64) — skip
    if (photo.url && !photo.dataUrl) return photo;
    // No image data — skip
    if (!photo.dataUrl) return photo;

    try {
      // Convert base64 data URL to a File
      const match = photo.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return photo;

      const mimeType = match[1];
      const base64 = match[2];
      const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const ext = mimeType.split("/")[1] || "jpg";
      const file = new File([binary], photo.filename || `photo.${ext}`, { type: mimeType });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("reportId", rid);

      const res = await fetch("/api/field-reports/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error("Photo upload failed:", await res.text());
        return photo; // Keep base64 as fallback
      }

      const data = await res.json();
      return { filename: photo.filename, caption: photo.caption, url: data.url };
    } catch (err) {
      console.error("Photo upload error:", err);
      return photo; // Keep base64 as fallback
    }
  };

  const save = async (status: string) => {
    if (!form.projectId) { alert("Please select a project"); return; }
    if (!form.date) { alert("Please select a date"); return; }
    if (status === "submitted" && form.photos.filter(p => p.filename || p.dataUrl || p.url).length < 6) {
      if (!confirm("You have fewer than 6 photos. Submit anyway?")) return;
    }
    setSaving(true);
    try {
      // Upload any photos that have base64 data to Supabase Storage
      const rid = reportId || "new-" + Date.now();
      const uploadedPhotos = await Promise.all(
        form.photos.map((p) => uploadPhotoToStorage(p, rid))
      );

      const payload = {
        ...form,
        photos: uploadedPhotos,
        status,
        daysRemaining: form.daysRemaining ? parseInt(form.daysRemaining) : null,
        negativeAirMachineCount: form.negativeAirMachineCount ? parseInt(form.negativeAirMachineCount) : null,
        estimatedHoursTotal: form.estimatedHoursTotal ? parseFloat(form.estimatedHoursTotal) : null,
      };

      const url = reportId ? `/api/field-reports/${reportId}` : "/api/field-reports";
      const method = reportId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/field-reports/${data.id || reportId}`);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        alert(err.error || "Failed to save report. Please try again.");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Failed to save report. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4 max-w-4xl">
      {/* Job Information */}
      <Section title="Job Information" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label required>Job / Project</Label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              value={form.projectId}
              onChange={(e) => { update("projectId", e.target.value); loadCarryForward(e.target.value); }}
              disabled={!!presetProjectId}
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.client}
                </option>
              ))}
            </select>
            {selectedProject && (
              <p className="text-xs text-slate-500 mt-1">{selectedProject.address} • Type: {selectedProject.type}</p>
            )}
          </div>
          <div>
            <Label required>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
          </div>
          <div>
            <Label>Supervisor</Label>
            <Input value={form.supervisorName} onChange={(e) => update("supervisorName", e.target.value)} placeholder="Supervisor name" />
          </div>
          <div>
            <Label>Project Manager</Label>
            <Input value={form.projectManagerName} onChange={(e) => update("projectManagerName", e.target.value)} placeholder="Project manager name" />
          </div>
        </div>
      </Section>

      {/* Weather */}
      {(form.weatherCurrentTemp || weatherLoading) && (
        <Section title="Weather Conditions" defaultOpen={true}>
          {weatherLoading ? (
            <p className="text-sm text-slate-500 animate-pulse">Fetching weather data...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label>Temperature</Label>
                <Input value={form.weatherCurrentTemp} onChange={(e) => update("weatherCurrentTemp", e.target.value)} />
              </div>
              <div>
                <Label>Wind</Label>
                <Input value={form.weatherCurrentWind} onChange={(e) => update("weatherCurrentWind", e.target.value)} />
              </div>
              <div>
                <Label>Conditions</Label>
                <Input value={form.weatherCurrentCondition} onChange={(e) => update("weatherCurrentCondition", e.target.value)} />
              </div>
              <div>
                <Label>Humidity</Label>
                <Input value={form.weatherCurrentHumidity} onChange={(e) => update("weatherCurrentHumidity", e.target.value)} />
              </div>
              <div>
                <Label>Heat Index</Label>
                <Input value={form.weatherCurrentHeatIndex} onChange={(e) => update("weatherCurrentHeatIndex", e.target.value)} />
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Carry-forward banner */}
      {carryForwardInfo?.hasHistory && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <Info size={18} className="flex-shrink-0 mt-0.5 text-blue-500" />
          <div>
            <span className="font-semibold">Pre-filled from previous report.</span> Project-level fields carried forward. Daily fields are fresh.
            {carryForwardInfo.previousGoalsForTomorrow && carryForwardInfo.previousGoalsForTomorrow !== "N/A" && (
              <div className="mt-1.5 p-2 bg-blue-100 rounded text-xs">
                <span className="font-semibold">Yesterday&apos;s goals for today:</span> {carryForwardInfo.previousGoalsForTomorrow}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scope of Work */}
      <Section title="Scope of Work">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Toggle label="Scope Received" checked={form.scopeReceived} onChange={(v) => update("scopeReceived", v)} />
          </div>
          <div>
            <Label>Scope Date</Label>
            <Input type="date" value={form.scopeDate} onChange={(e) => update("scopeDate", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Detailed Description of Scope</Label>
          <TextArea rows={4} value={form.scopeDescription} onChange={(e) => update("scopeDescription", e.target.value)} placeholder="Describe the full scope of work for this project..." />
        </div>
        <div>
          <Label>Work Area Locations</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={workAreaInput}
              onChange={(e) => setWorkAreaInput(e.target.value)}
              placeholder="Add a location (e.g., Kitchen, Bathroom, Basement)"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWorkArea(); } }}
            />
            <button type="button" onClick={addWorkArea} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 whitespace-nowrap">
              Add
            </button>
          </div>
          {form.workAreaLocations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.workAreaLocations.map((loc, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full">
                  {loc}
                  <button type="button" onClick={() => removeWorkArea(i)} className="hover:text-red-500"><X size={14} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Project Timeline */}
      <Section title="Project Timeline">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Estimated Completion Date</Label>
            <Input type="date" value={form.estimatedCompletionDate} onChange={(e) => update("estimatedCompletionDate", e.target.value)} />
          </div>
          <div>
            <Label>Days Remaining (incl. Demob)</Label>
            <Input type="number" value={form.daysRemaining} onChange={(e) => update("daysRemaining", e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Estimated Total Hours</Label>
            <Input type="number" step="0.5" value={form.estimatedHoursTotal} onChange={(e) => update("estimatedHoursTotal", e.target.value)} placeholder="e.g., 120" />
          </div>
        </div>
      </Section>

      {/* Work Completed */}
      <Section title="Work Completed Today" defaultOpen={true}>
        <div>
          <Label required>Work Completed</Label>
          <TextArea
            rows={6}
            value={form.workCompletedToday}
            onChange={(e) => update("workCompletedToday", e.target.value)}
            placeholder="Describe the work completed today in detail (e.g., setup, demolition, containment, removal, detail work, workflow)..."
          />
        </div>
      </Section>

      {/* End of Shift Review */}
      <Section title="End of Shift Review" defaultOpen={true}>
        <div>
          <Label>How did the day go? What went well and what could be improved?</Label>
          <TextArea rows={3} value={form.shiftReview} onChange={(e) => update("shiftReview", e.target.value)} placeholder="Describe what went well today and any areas for improvement..." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Toggle label="Incident" checked={form.incident} onChange={(v) => update("incident", v)} />
            {form.incident && (
              <TextArea rows={2} value={form.incidentDetails} onChange={(e) => update("incidentDetails", e.target.value)} placeholder="Describe the incident..." />
            )}
          </div>
          <div className="space-y-2">
            <Toggle label="Stop Work" checked={form.stopWork} onChange={(v) => update("stopWork", v)} />
            {form.stopWork && (
              <TextArea rows={2} value={form.stopWorkDetails} onChange={(e) => update("stopWorkDetails", e.target.value)} placeholder="Describe the stop work event..." />
            )}
          </div>
        </div>
        {(form.incident || form.stopWork) && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertTriangle size={16} />
            <span>Safety event flagged — this will be highlighted in reports and alerts.</span>
          </div>
        )}
      </Section>

      {/* Goals */}
      <Section title="Goals">
        <div>
          <Label>Goals for Tomorrow</Label>
          <TextArea rows={2} value={form.goalsForTomorrow} onChange={(e) => update("goalsForTomorrow", e.target.value)} />
        </div>
        <div>
          <Label>Goals for the Week</Label>
          <TextArea rows={2} value={form.goalsForWeek} onChange={(e) => update("goalsForWeek", e.target.value)} />
        </div>
      </Section>

      {/* Notes, Meetings & Visitors */}
      <Section title="Notes, Meetings & Visitors">
        <div>
          <Label>Project Notes or Special Considerations</Label>
          <TextArea rows={2} value={form.projectNotes} onChange={(e) => update("projectNotes", e.target.value)} />
        </div>
        <div>
          <Label>Meeting Log</Label>
          <TextArea rows={2} value={form.meetingLog} onChange={(e) => update("meetingLog", e.target.value)} placeholder="Safety topics discussed..." />
        </div>
        <div>
          <Label>Visitors</Label>
          <Input value={form.visitors} onChange={(e) => update("visitors", e.target.value)} placeholder="Names of visitors on site" />
        </div>
      </Section>

      {/* Equipment & Monitoring */}
      <Section title="Equipment & Monitoring">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Number of Negative Air Machines</Label>
            <Input type="number" value={form.negativeAirMachineCount} onChange={(e) => update("negativeAirMachineCount", e.target.value)} placeholder="0" />
          </div>
          <div>
            <Toggle label="Negative Air Established?" checked={form.negativeAirEstablished} onChange={(v) => update("negativeAirEstablished", v)} />
          </div>
        </div>
        <div>
          <Label>Equipment Malfunctions</Label>
          <TextArea rows={2} value={form.equipmentMalfunctions} onChange={(e) => update("equipmentMalfunctions", e.target.value)} placeholder="Describe any equipment malfunctions or issues. Enter 'None' if all equipment operated normally." />
        </div>
        <div>
          <Label>Manometer Readout / Receipt Photo</Label>
          <p className="text-xs text-slate-500 mb-2">Upload or snap a photo of the manometer screen and printout receipt showing differential pressure readings.</p>
          {form.manometerPhoto && form.manometerPhoto.startsWith("data:") ? (
            <div className="relative inline-block">
              <img src={form.manometerPhoto} alt="Manometer readout" className="max-h-48 rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => update("manometerPhoto", "")}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg border border-indigo-200 hover:bg-indigo-100 cursor-pointer transition">
                <Upload size={16} />
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const dataUrl = await resizeImage(file);
                    update("manometerPhoto", dataUrl);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer transition">
                <Camera size={16} />
                Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const dataUrl = await resizeImage(file);
                    update("manometerPhoto", dataUrl);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
          {form.manometerPhoto && !form.manometerPhoto.startsWith("data:") && (
            <Input value={form.manometerPhoto} onChange={(e) => update("manometerPhoto", e.target.value)} placeholder="Photo filename (e.g., IMG_3024_manometer.jpeg)" />
          )}
        </div>
      </Section>

      {/* Asbestos in Work Area */}
      <Section title="Asbestos Identified in Work Area">
        <div>
          <Label>List all asbestos-containing materials (ACM) identified within today&apos;s work area</Label>
          <TextArea
            rows={4}
            value={form.asbestosInWorkArea}
            onChange={(e) => update("asbestosInWorkArea", e.target.value)}
            placeholder={"e.g.,\n- 9x9 floor tile and mastic (non-friable, Category I)\n- Drywall joint compound (friable)\n- Pipe insulation on heating lines (friable, Category II)"}
          />
        </div>
      </Section>

      {/* Daily Pictures */}
      <Section title="Daily Pictures">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 space-y-2">
          <div className="flex items-start gap-2">
            <Camera size={16} className="flex-shrink-0 mt-0.5 text-indigo-500" />
            <div>
              <span className="font-semibold text-slate-800">Minimum 6 photos required per day.</span> Capture clear, well-lit photos that document the current state of work. Required shots:
            </div>
          </div>
          <ul className="ml-7 space-y-1 text-xs text-slate-500">
            <li>1. <span className="font-medium text-slate-700">Overall work area</span> — wide shot showing full containment or work zone</li>
            <li>2. <span className="font-medium text-slate-700">Containment setup</span> — poly sheeting, critical barriers, decontamination unit</li>
            <li>3. <span className="font-medium text-slate-700">Work in progress</span> — active removal, demolition, or detail work</li>
            <li>4. <span className="font-medium text-slate-700">Manometer / pressure reading</span> — screen showing current differential pressure</li>
            <li>5. <span className="font-medium text-slate-700">Waste handling</span> — bagged waste, labeled containers, staging area</li>
            <li>6. <span className="font-medium text-slate-700">End-of-day conditions</span> — final state of work area before leaving</li>
          </ul>
          <p className="ml-7 text-xs text-slate-500">
            <span className="font-medium">Tips:</span> Ensure photos are in focus, landscape orientation preferred. Include reference points for scale. Timestamp is captured automatically by your phone camera.
          </p>
        </div>

        {form.photos.filter(p => p.filename || p.dataUrl).length < 6 && form.photos.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <AlertTriangle size={14} />
            <span>{6 - form.photos.filter(p => p.filename).length} more photo{6 - form.photos.filter(p => p.filename).length !== 1 ? "s" : ""} needed to meet the minimum of 6.</span>
          </div>
        )}

        <div className="space-y-3">
          {form.photos.map((photo, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-400 w-5 text-right mt-1 flex-shrink-0">{i + 1}.</span>
              {(photo.url || photo.dataUrl) ? (
                <img src={photo.url || photo.dataUrl} alt={photo.caption || `Photo ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center flex-shrink-0">
                  <label className="cursor-pointer flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-500 transition">
                    <Camera size={16} />
                    <span className="text-[9px]">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await resizeImage(file);
                        const updated = [...form.photos];
                        updated[i] = { ...updated[i], dataUrl, filename: file.name };
                        update("photos", updated);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              )}
              <div className="flex-1 space-y-1.5 min-w-0">
                <Input
                  value={photo.filename}
                  onChange={(e) => {
                    const updated = [...form.photos];
                    updated[i] = { ...updated[i], filename: e.target.value };
                    update("photos", updated);
                  }}
                  placeholder="Filename (e.g., IMG_3012.jpeg)"
                />
                <Input
                  value={photo.caption}
                  onChange={(e) => {
                    const updated = [...form.photos];
                    updated[i] = { ...updated[i], caption: e.target.value };
                    update("photos", updated);
                  }}
                  placeholder="Caption (e.g., Overall work area)"
                />
              </div>
              <button type="button" onClick={() => update("photos", form.photos.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 flex-shrink-0 mt-1">
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg border border-indigo-200 hover:bg-indigo-100 cursor-pointer transition">
              <Upload size={16} />
              Upload Photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  const newPhotos: PhotoEntry[] = [];
                  for (const file of Array.from(files)) {
                    const dataUrl = await resizeImage(file);
                    newPhotos.push({ filename: file.name, caption: "", dataUrl });
                  }
                  update("photos", [...form.photos, ...newPhotos]);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer transition">
              <Camera size={16} />
              Take Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await resizeImage(file);
                  update("photos", [...form.photos, { filename: file.name, caption: "", dataUrl }]);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => update("photos", [...form.photos, { filename: "", caption: "" }])}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium px-4 py-2"
            >
              + Add Manually
            </button>
          </div>
        </div>
      </Section>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2 pb-8 sticky bottom-0 bg-white border-t border-slate-200 -mx-6 px-6 py-4">
        <button
          type="button"
          onClick={() => save("draft")}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          <Save size={16} />
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => save("submitted")}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          <Send size={16} />
          Submit Report
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
