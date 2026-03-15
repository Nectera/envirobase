"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Send } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { logger } from "@/lib/logger";

interface Project {
  id: string;
  name: string;
  address: string;
}

interface CertificateFormProps {
  initialProjectId?: string;
  certificateId?: string;
  initialData?: any;
}

export default function CertificateForm({
  initialProjectId,
  certificateId,
  initialData,
}: CertificateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [formData, setFormData] = useState({
    projectId: initialProjectId || "",
    workSiteAddress: "",
    policyNumber: "",
    claimNumber: "",
    purchaseOrderNumber: "",
    jobNumber: "",
    demobilizationDate: new Date().toISOString().split("T")[0],
    propertyOwnerName: "",
    propertyOwnerSignDate: new Date().toISOString().split("T")[0],
    companyRepName: "",
    companyRepSignDate: new Date().toISOString().split("T")[0],
    status: "draft",
  });

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (error) {
        logger.error("Failed to load projects", { error: String(error) });
      } finally {
        setProjectsLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        projectId: initialData.projectId || initialProjectId || "",
        workSiteAddress: initialData.workSiteAddress || "",
        policyNumber: initialData.policyNumber || "",
        claimNumber: initialData.claimNumber || "",
        purchaseOrderNumber: initialData.purchaseOrderNumber || "",
        jobNumber: initialData.jobNumber || "",
        demobilizationDate: initialData.demobilizationDate || new Date().toISOString().split("T")[0],
        propertyOwnerName: initialData.propertyOwnerName || "",
        propertyOwnerSignDate: initialData.propertyOwnerSignDate || new Date().toISOString().split("T")[0],
        companyRepName: initialData.companyRepName || "",
        companyRepSignDate: initialData.companyRepSignDate || new Date().toISOString().split("T")[0],
        status: initialData.status || "draft",
      });
    }
  }, [initialData, initialProjectId]);

  // Auto-fill work site address when project changes
  useEffect(() => {
    if (formData.projectId && projects.length > 0) {
      const selected = projects.find((p) => p.id === formData.projectId);
      if (selected && !initialData) {
        setFormData((prev) => ({
          ...prev,
          workSiteAddress: selected.address || "",
        }));
      }
    }
  }, [formData.projectId, projects, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = certificateId
        ? `/api/certificate-of-completion/${certificateId}`
        : "/api/certificate-of-completion";
      const method = certificateId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, status: "draft" }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/certificate-of-completion/${data.id}`);
      } else {
        alert("Failed to save draft");
      }
    } catch (error) {
      logger.error("Error saving draft", { error: String(error) });
      alert("Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = certificateId
        ? `/api/certificate-of-completion/${certificateId}`
        : "/api/certificate-of-completion";
      const method = certificateId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, status: "submitted" }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/certificate-of-completion/${data.id}`);
      } else {
        alert("Failed to submit certificate");
      }
    } catch (error) {
      logger.error("Error submitting certificate", { error: String(error) });
      alert("Failed to submit certificate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6">
      {/* Project Selection */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Project</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
          <select
            name="projectId"
            value={formData.projectId}
            onChange={handleChange}
            disabled={projectsLoading || !!initialProjectId}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="">Select a project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Site Information */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Site Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Work Site Address</label>
            <AddressAutocomplete
              value={formData.workSiteAddress}
              onChange={(val) => setFormData((prev) => ({ ...prev, workSiteAddress: val }))}
              onSelect={(result) => setFormData((prev) => ({ ...prev, workSiteAddress: result.fullAddress }))}
              placeholder="Enter work site address"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Policy Number</label>
              <input
                type="text"
                name="policyNumber"
                value={formData.policyNumber}
                onChange={handleChange}
                placeholder="Enter policy number"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Claim Number</label>
              <input
                type="text"
                name="claimNumber"
                value={formData.claimNumber}
                onChange={handleChange}
                placeholder="Enter claim number"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Order Number</label>
              <input
                type="text"
                name="purchaseOrderNumber"
                value={formData.purchaseOrderNumber}
                onChange={handleChange}
                placeholder="Enter PO number"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Number</label>
              <input
                type="text"
                name="jobNumber"
                value={formData.jobNumber}
                onChange={handleChange}
                placeholder="Enter job number"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Demobilization Date</label>
            <input
              type="date"
              name="demobilizationDate"
              value={formData.demobilizationDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Signatures</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Property Owner */}
          <div className="space-y-4">
            <h3 className="font-medium text-slate-700">Property Owner / Agent</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                name="propertyOwnerName"
                value={formData.propertyOwnerName}
                onChange={handleChange}
                placeholder="Enter property owner name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sign Date</label>
              <input
                type="date"
                name="propertyOwnerSignDate"
                value={formData.propertyOwnerSignDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Company Rep */}
          <div className="space-y-4">
            <h3 className="font-medium text-slate-700">Company Representative</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                name="companyRepName"
                value={formData.companyRepName}
                onChange={handleChange}
                placeholder="Enter company rep name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sign Date</label>
              <input
                type="date"
                name="companyRepSignDate"
                value={formData.companyRepSignDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={loading || !formData.projectId}
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} /> Save Draft
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !formData.projectId}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={16} /> Submit
        </button>
      </div>
    </form>
  );
}
