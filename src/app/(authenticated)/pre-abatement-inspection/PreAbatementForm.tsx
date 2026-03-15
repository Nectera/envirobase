"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Plus, Trash2, Save, Send, Loader2, MapPin } from "lucide-react";
import { PRE_ABATEMENT_ITEMS, REMOVAL_TECHNIQUES } from "@/lib/pre-abatement-checklist";

type ChecklistValue = "yes" | "no" | "na";

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3 text-left border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

export default function PreAbatementForm({ presetProjectId }: { presetProjectId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Basic Info
  const [projectId, setProjectId] = useState(presetProjectId || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [inspector, setInspector] = useState("");
  const [contractorSupervisor, setContractorSupervisor] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [projectAddress, setProjectAddress] = useState("");

  // Removal Techniques
  const [removalTechnique, setRemovalTechnique] = useState<string[]>([]);

  // Checklist Items
  const [checklistItems, setChecklistItems] = useState<Record<string, ChecklistValue>>({});

  // Comments
  const [comments, setComments] = useState("");

  // Projects list
  const [projects, setProjects] = useState<any[]>([]);

  // Load projects
  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then(setProjects).catch(() => setProjects([]));
  }, []);

  // Update project address when project changes
  useEffect(() => {
    if (projectId) {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setProjectAddress(project.address || "");
      }
    }
  }, [projectId, projects]);

  // Carry-forward from previous inspection
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/pre-abatement-inspection?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.length > 0) {
          const latest = data[0];
          if (latest.contractorSupervisor) setContractorSupervisor(latest.contractorSupervisor);
          if (latest.projectManager) setProjectManager(latest.projectManager);
        }
      })
      .catch(() => {});
  }, [projectId]);

  function toggleRemovalTechnique(key: string) {
    setRemovalTechnique((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function setChecklistValue(itemKey: string, value: ChecklistValue) {
    setChecklistItems((prev) => ({ ...prev, [itemKey]: value }));
  }

  async function handleSubmit(status: "draft" | "submitted") {
    setLoading(true);
    setError("");

    if (!projectId) {
      setError("Please select a project");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/pre-abatement-inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          date,
          inspector,
          contractorSupervisor,
          projectManager,
          removalTechnique,
          checklistItems,
          comments,
          status,
          createdBy: "user", // In real app, use actual user
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      const item = await response.json();
      router.push(`/pre-abatement-inspection/${item.id}`);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <Section title="Inspection Details" defaultOpen={true}>
        <div className="space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Address (auto-populated) */}
          {projectAddress && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Address</label>
              <div className="flex items-start gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                <MapPin size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">{projectAddress}</span>
              </div>
            </div>
          )}

          {/* Inspection Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inspection Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* People */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inspector</label>
              <input
                type="text"
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                placeholder="Inspector name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contractor Supervisor</label>
              <input
                type="text"
                value={contractorSupervisor}
                onChange={(e) => setContractorSupervisor(e.target.value)}
                placeholder="Supervisor name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Manager</label>
              <input
                type="text"
                value={projectManager}
                onChange={(e) => setProjectManager(e.target.value)}
                placeholder="Project Manager name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Removal Techniques */}
      <Section title="Removal Techniques" defaultOpen={true}>
        <div className="space-y-2">
          {REMOVAL_TECHNIQUES.map((technique) => (
            <label key={technique.key} className="flex items-center gap-3 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={removalTechnique.includes(technique.key)}
                onChange={() => toggleRemovalTechnique(technique.key)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">{technique.label}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Inspection Checklist */}
      <Section title={`Inspection Checklist (${PRE_ABATEMENT_ITEMS.length} items)`} defaultOpen={true}>
        <div className="space-y-4">
          {PRE_ABATEMENT_ITEMS.map((item) => {
            const currentValue = checklistItems[item.key] || "na";
            return (
              <div key={item.key} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm font-medium text-slate-800 flex-1">{item.label}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={item.key}
                        value="yes"
                        checked={currentValue === "yes"}
                        onChange={() => setChecklistValue(item.key, "yes")}
                        className="w-4 h-4 border-slate-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-xs font-medium text-green-700">Yes</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={item.key}
                        value="no"
                        checked={currentValue === "no"}
                        onChange={() => setChecklistValue(item.key, "no")}
                        className="w-4 h-4 border-slate-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs font-medium text-red-700">No</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={item.key}
                        value="na"
                        checked={currentValue === "na"}
                        onChange={() => setChecklistValue(item.key, "na")}
                        className="w-4 h-4 border-slate-300 text-slate-600 focus:ring-slate-500"
                      />
                      <span className="text-xs font-medium text-slate-700">N/A</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Comments */}
      <Section title="Comments" defaultOpen={true}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Additional Comments</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Any additional observations or notes..."
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
      </Section>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={() => handleSubmit("draft")}
          disabled={loading || !projectId}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:opacity-50 text-slate-800 font-medium rounded-lg transition"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save as Draft
        </button>
        <button
          onClick={() => handleSubmit("submitted")}
          disabled={loading || !projectId}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600 disabled:opacity-50 text-white font-medium rounded-lg transition"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Submit
        </button>
      </div>
    </div>
  );
}
