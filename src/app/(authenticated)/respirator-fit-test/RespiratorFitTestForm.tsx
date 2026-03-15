"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, CheckCircle } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { FIT_TEST_ITEMS, RESPIRATOR_TYPES, RESPIRATOR_SIZES } from "@/lib/respirator-fit-tests";

export default function RespiratorFitTestForm({
  presetWorkerId,
  presetProjectId
}: {
  presetWorkerId?: string;
  presetProjectId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Lists
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Form fields
  const [workerId, setWorkerId] = useState(presetWorkerId || "");
  const [projectId, setProjectId] = useState(presetProjectId || "");
  const [branchLocation, setBranchLocation] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectSupervisor, setProjectSupervisor] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [employeeName, setEmployeeName] = useState("");
  const [respiratorType, setRespiratorType] = useState("");
  const [respiratorSize, setRespiratorSize] = useState("");
  const [testResults, setTestResults] = useState<Record<string, "pass" | "fail" | "na">>({});
  const [comments, setComments] = useState("");
  const [performedByName, setPerformedByName] = useState("");
  const [performedByDate, setPerformedByDate] = useState(new Date().toISOString().split("T")[0]);
  const [employeeSignDate, setEmployeeSignDate] = useState("");

  // Load workers and projects
  useEffect(() => {
    Promise.all([
      fetch("/api/workers").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json())
    ]).then(([w, p]) => {
      setWorkers(w);
      setProjects(p);
    });
  }, []);

  // Auto-fill employee name when worker is selected
  useEffect(() => {
    if (workerId) {
      const worker = workers.find((w) => w.id === workerId);
      if (worker) {
        setEmployeeName(worker.name);
      }
    }
  }, [workerId, workers]);

  // Auto-fill project info when project is selected
  useEffect(() => {
    if (projectId) {
      const proj = projects.find((p) => p.id === projectId);
      if (proj) {
        setProjectName(proj.name || "");
        setJobAddress(proj.address || "");
        setProjectNumber(proj.projectNumber || "");
      }
    }
  }, [projectId, projects]);

  function setTestResult(key: string, value: "pass" | "fail" | "na") {
    setTestResults((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  async function handleSave(status: "draft" | "completed") {
    if (!workerId) {
      setError("Please select a worker");
      return;
    }
    if (!testDate) {
      setError("Please enter a test date");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/respirator-fit-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId,
          projectId: projectId || null,
          branchLocation,
          jobAddress,
          projectName,
          projectSupervisor,
          projectManager,
          projectNumber,
          supervisor,
          testDate,
          employeeName,
          respiratorType,
          respiratorSize,
          testResults,
          comments,
          performedByName,
          performedByDate,
          employeeSignDate: status === "completed" ? employeeSignDate || new Date().toISOString().split("T")[0] : employeeSignDate,
          status,
          createdBy: "current-user"
        })
      });

      if (!res.ok) throw new Error("Failed to save");

      const created = await res.json();
      router.push(`/respirator-fit-test/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to save");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Worker & Project Selection */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Assignment</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Worker *
            </label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a worker...</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Project (Optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Project Information */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Project Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Branch Location"
            value={branchLocation}
            onChange={(e) => setBranchLocation(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <AddressAutocomplete
            value={jobAddress}
            onChange={(val) => setJobAddress(val)}
            onSelect={(result) => setJobAddress(result.fullAddress)}
            placeholder="Job Address"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Project Number"
            value={projectNumber}
            onChange={(e) => setProjectNumber(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Project Supervisor"
            value={projectSupervisor}
            onChange={(e) => setProjectSupervisor(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Project Manager"
            value={projectManager}
            onChange={(e) => setProjectManager(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* General Information */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">General Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Supervisor
            </label>
            <input
              type="text"
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Test Date *
            </label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Employee Information */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Employee Information</h3>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            disabled
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-600"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Type of Respirator
            </label>
            <select
              value={respiratorType}
              onChange={(e) => setRespiratorType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a type...</option>
              {RESPIRATOR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Size
            </label>
            <select
              value={respiratorSize}
              onChange={(e) => setRespiratorSize(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a size...</option>
              {RESPIRATOR_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Fit Test Results</h3>

        <div className="space-y-3">
          {FIT_TEST_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">{item.label}</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`test-${item.key}`}
                    value="pass"
                    checked={testResults[item.key] === "pass"}
                    onChange={() => setTestResult(item.key, "pass")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-green-700">Pass</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`test-${item.key}`}
                    value="fail"
                    checked={testResults[item.key] === "fail"}
                    onChange={() => setTestResult(item.key, "fail")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-red-700">Fail</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`test-${item.key}`}
                    value="na"
                    checked={testResults[item.key] === "na"}
                    onChange={() => setTestResult(item.key, "na")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-600">N/A</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Comments</h3>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Additional notes or observations..."
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Inspection Details */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Inspection Performed By</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={performedByName}
              onChange={(e) => setPerformedByName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={performedByDate}
              onChange={(e) => setPerformedByDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Employee Attestation */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Employee Attestation</h3>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Employee Signature Date
          </label>
          <input
            type="date"
            value={employeeSignDate}
            onChange={(e) => setEmployeeSignDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSave("draft")}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-lg transition"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save as Draft
        </button>

        <button
          onClick={() => handleSave("completed")}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          Complete & Save
        </button>
      </div>
    </div>
  );
}
