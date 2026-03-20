"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FileText,
  Upload,
  Trash2,
  Plus,
  Save,
  Check,
  Loader2,
  Camera,
  AlertTriangle,
  Download,
  X,
} from "lucide-react";

interface Personnel {
  id: string;
  name: string;
  role: "Supervisor" | "Worker";
  certNumber: string;
}

interface MethDeconReport {
  id: string;
  projectId: string;
  date: string;
  completionDate: string;
  status: "draft" | "complete" | "submitted";
  personnel: Personnel[];
  deconProcedure: string;
  removalProcedure: string;
  encapsulation: string;
  wasteManagement: string;
  variationsFromStd: string;
  signedByName: string;
  signedByTitle: string;
  signedDate: string;
  wasteManifestPhotos: any[];
  projectPhotos: any[];
  createdAt: string;
  updatedAt: string;
}

interface MethDeconReportSectionProps {
  projectId: string;
  projectType: string;
  projectName: string;
  projectAddress: string;
}

const defaultReport: Partial<MethDeconReport> = {
  date: new Date().toISOString().split("T")[0],
  completionDate: new Date().toISOString().split("T")[0],
  status: "draft",
  personnel: [],
  deconProcedure: "",
  removalProcedure: "",
  encapsulation: "N/A. No surfaces were encapsulated.",
  wasteManagement: "",
  variationsFromStd: "No variance in work procedures was employed.",
  signedByName: "",
  signedByTitle: "",
  signedDate: new Date().toISOString().split("T")[0],
  wasteManifestPhotos: [],
  projectPhotos: [],
};

export default function MethDeconReportSection({
  projectId,
  projectType,
  projectName,
  projectAddress,
}: MethDeconReportSectionProps) {
  // Only render for METH projects
  if (projectType !== "METH") {
    return null;
  }

  const router = useRouter();
  const [report, setReport] = useState<Partial<MethDeconReport> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [autoPopulatingPersonnel, setAutoPopulatingPersonnel] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState<"waste" | "project" | null>(null);
  const wastePhotoRef = useRef<HTMLInputElement>(null);
  const projectPhotoRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Fetch existing report or initialize new one
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/meth-decon-report?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          const reportData = Array.isArray(data) ? data[0] : data;
          setReport(reportData);
        } else {
          setReport(defaultReport);
        }
      } catch (error) {
        console.error("Failed to fetch report:", error);
        setReport(defaultReport);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [projectId]);

  // Auto-save on field blur (debounced)
  const handleAutoSave = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      if (report?.id) {
        saveReport("draft");
      }
    }, 1500);
  }, [report]);

  // Save report to backend
  const saveReport = async (status: "draft" | "complete" | "submitted" = report?.status || "draft") => {
    if (!report) return;
    setSaving(true);
    setSaveStatus("saving");

    try {
      const method = report.id ? "PUT" : "POST";
      const endpoint = report.id ? `/api/meth-decon-report/${report.id}` : "/api/meth-decon-report";

      const payload = {
        projectId,
        date: report.date,
        completionDate: report.completionDate,
        status,
        personnel: report.personnel,
        deconProcedure: report.deconProcedure,
        removalProcedure: report.removalProcedure,
        encapsulation: report.encapsulation,
        wasteManagement: report.wasteManagement,
        variationsFromStd: report.variationsFromStd,
        signedByName: report.signedByName,
        signedByTitle: report.signedByTitle,
        signedDate: report.signedDate,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save report");
      }

      const savedReport = await res.json();
      setReport(savedReport);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      router.refresh();
    } catch (error) {
      console.error("Error saving report:", error);
      alert("Failed to save report. Please try again.");
      setSaveStatus("idle");
    } finally {
      setSaving(false);
    }
  };

  // Auto-populate personnel from project team
  const handleAutoPopulatePersonnel = async () => {
    if (!report?.id) {
      alert("Please save the report first before auto-populating personnel.");
      return;
    }

    setAutoPopulatingPersonnel(true);
    try {
      const res = await fetch(`/api/meth-decon-report/${report.id}/personnel`);
      if (res.ok) {
        const data = await res.json();
        setReport((prev) => (prev ? { ...prev, personnel: data } : prev));
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        alert("No project team found to auto-populate.");
      }
    } catch (error) {
      console.error("Error auto-populating personnel:", error);
      alert("Failed to auto-populate personnel.");
    } finally {
      setAutoPopulatingPersonnel(false);
    }
  };

  // Upload photos
  const handlePhotoUpload = async (files: FileList, type: "waste" | "project") => {
    if (!report?.id) {
      alert("Please save the report first before uploading photos.");
      return;
    }

    setUploadingPhotos(type);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("type", type === "waste" ? "waste_manifest" : "project_photo");

        const res = await fetch(`/api/meth-decon-report/${report.id}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Failed to upload photos");
        }

        const data = await res.json();
        const photoObj = { url: data.url, name: data.fileName, uploadedAt: new Date().toISOString() };
        setReport((prev) => {
          if (!prev) return prev;
          if (type === "waste") {
            return {
              ...prev,
              wasteManifestPhotos: [...(prev.wasteManifestPhotos || []), photoObj],
            };
          } else {
            return {
              ...prev,
              projectPhotos: [...(prev.projectPhotos || []), photoObj],
            };
          }
        });
      }

      // Clear file input
      if (type === "waste" && wastePhotoRef.current) {
        wastePhotoRef.current.value = "";
      }
      if (type === "project" && projectPhotoRef.current) {
        projectPhotoRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading photos:", error);
      alert("Failed to upload photos. Please try again.");
    } finally {
      setUploadingPhotos(null);
    }
  };

  // Delete photo
  const handleDeletePhoto = async (photoUrl: string, type: "waste" | "project") => {
    if (!report?.id) return;

    try {
      const res = await fetch(`/api/meth-decon-report/${report.id}/photo`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl, type: type === "waste" ? "waste_manifest" : "project_photo" }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete photo");
      }

      setReport((prev) => {
        if (!prev) return prev;
        if (type === "waste") {
          return {
            ...prev,
            wasteManifestPhotos: (prev.wasteManifestPhotos || []).filter(
              (p: any) => (typeof p === "string" ? p : p.url) !== photoUrl
            ),
          };
        } else {
          return {
            ...prev,
            projectPhotos: (prev.projectPhotos || []).filter(
              (p: any) => (typeof p === "string" ? p : p.url) !== photoUrl
            ),
          };
        }
      });
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Failed to delete photo.");
    }
  };

  // Add/remove personnel
  const addPersonnel = () => {
    setReport((prev) =>
      prev
        ? {
            ...prev,
            personnel: [
              ...(prev.personnel || []),
              { id: Math.random().toString(36).substr(2, 9), name: "", role: "Worker", certNumber: "" },
            ],
          }
        : prev
    );
  };

  const removePersonnel = (id: string) => {
    setReport((prev) =>
      prev
        ? {
            ...prev,
            personnel: (prev.personnel || []).filter((p) => p.id !== id),
          }
        : prev
    );
  };

  const updatePersonnel = (id: string, field: keyof Personnel, value: string) => {
    setReport((prev) =>
      prev
        ? {
            ...prev,
            personnel: (prev.personnel || []).map((p) =>
              p.id === id ? { ...p, [field]: value } : p
            ),
          }
        : prev
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-8 text-slate-500">
        Failed to load report.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="border border-slate-200 rounded-xl bg-white">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText size={16} className="text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-700">Meth Decontamination Report</h3>
          <div className="ml-auto flex items-center gap-2">
            {saveStatus === "saving" && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <Check size={14} />
                Saved
              </span>
            )}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {report.status === "draft" && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                DRAFT
              </span>
            )}
            {report.status === "complete" && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-600">
                COMPLETE
              </span>
            )}
            {report.status === "submitted" && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-600">
                SUBMITTED
              </span>
            )}
          </div>

          {/* Header Info: Report Date, Completion Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Report Date
              </label>
              <input
                type="date"
                value={report.date || ""}
                onChange={(e) => {
                  setReport((prev) => prev ? { ...prev, date: e.target.value } : prev);
                  handleAutoSave();
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Completion Date
              </label>
              <input
                type="date"
                value={report.completionDate || ""}
                onChange={(e) => {
                  setReport((prev) => prev ? { ...prev, completionDate: e.target.value } : prev);
                  handleAutoSave();
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Personnel Section */}
      <div className="border border-slate-200 rounded-xl bg-white">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users size={16} className="text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-700">Personnel</h3>
          <button
            onClick={handleAutoPopulatePersonnel}
            disabled={autoPopulatingPersonnel || !report.id}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-medium transition-colors"
          >
            {autoPopulatingPersonnel ? (
              <>
                <Loader2 size={12} className="inline mr-1 animate-spin" />
                Loading...
              </>
            ) : (
              "Auto-populate from Project Team"
            )}
          </button>
        </div>

        <div className="px-5 py-4">
          {report.personnel && report.personnel.length > 0 ? (
            <div className="space-y-3">
              {report.personnel.map((person) => (
                <div key={person.id} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={person.name}
                      onChange={(e) => updatePersonnel(person.id, "name", e.target.value)}
                      onBlur={handleAutoSave}
                      placeholder="Worker name"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Role
                    </label>
                    <select
                      value={person.role}
                      onChange={(e) => updatePersonnel(person.id, "role", e.target.value as "Supervisor" | "Worker")}
                      onBlur={handleAutoSave}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
                    >
                      <option value="Supervisor">Supervisor</option>
                      <option value="Worker">Worker</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Cert #
                    </label>
                    <input
                      type="text"
                      value={person.certNumber}
                      onChange={(e) => updatePersonnel(person.id, "certNumber", e.target.value)}
                      onBlur={handleAutoSave}
                      placeholder="Certification #"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
                    />
                  </div>
                  <button
                    onClick={() => removePersonnel(person.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-3">No personnel added yet.</p>
          )}
          <button
            onClick={addPersonnel}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Personnel
          </button>
        </div>
      </div>

      {/* Text Sections */}
      <div className="border border-slate-200 rounded-xl bg-white">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Procedures</h3>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Decontamination Procedure */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Decontamination Procedure
            </label>
            <textarea
              value={report.deconProcedure || ""}
              onChange={(e) => {
                setReport((prev) => prev ? { ...prev, deconProcedure: e.target.value } : prev);
                handleAutoSave();
              }}
              placeholder="Describe the decontamination procedure..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
            />
          </div>

          {/* Removal Procedure */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Removal Procedure
            </label>
            <textarea
              value={report.removalProcedure || ""}
              onChange={(e) => {
                setReport((prev) => prev ? { ...prev, removalProcedure: e.target.value } : prev);
                handleAutoSave();
              }}
              placeholder="Describe the removal procedure..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
            />
          </div>

          {/* Encapsulation Procedure */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Encapsulation Procedure
            </label>
            <textarea
              value={report.encapsulation || ""}
              onChange={(e) => {
                setReport((prev) => prev ? { ...prev, encapsulation: e.target.value } : prev);
                handleAutoSave();
              }}
              placeholder="Describe the encapsulation procedure..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
            />
          </div>

          {/* Waste Management */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Waste Management
            </label>
            <textarea
              value={report.wasteManagement || ""}
              onChange={(e) => {
                setReport((prev) => prev ? { ...prev, wasteManagement: e.target.value } : prev);
                handleAutoSave();
              }}
              placeholder="Describe waste management procedures..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
            />
          </div>

          {/* Variations from Standard Practice */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Variations from Standard Practice
            </label>
            <textarea
              value={report.variationsFromStd || ""}
              onChange={(e) => {
                setReport((prev) => prev ? { ...prev, variationsFromStd: e.target.value } : prev);
                handleAutoSave();
              }}
              placeholder="Describe any variations..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
            />
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="border border-slate-200 rounded-xl bg-white">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Signature</h3>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Printed Name
            </label>
            <input
              type="text"
              value={report.signedByName || ""}
              onChange={(e) => {
                setReport((prev) => prev ? { ...prev, signedByName: e.target.value } : prev);
                handleAutoSave();
              }}
              placeholder="Name of signatory"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Title
            </label>
            <input
              type="text"
              value={report.signedByTitle || ""}
              onChange={(e) => {
                setReport((prev) => prev ? { ...prev, signedByTitle: e.target.value } : prev);
                handleAutoSave();
              }}
              placeholder="Position/Title"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Signature Date
            </label>
            <input
              type="date"
              value={report.signedDate || ""}
              onChange={(e) => {
                setReport((prev) => prev ? { ...prev, signedDate: e.target.value } : prev);
                handleAutoSave();
              }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC143]/30 focus:border-[#7BC143]"
            />
          </div>
        </div>
      </div>

      {/* Photo Uploads Section */}
      <div className="border border-slate-200 rounded-xl bg-white">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Camera size={16} />
            Photo Uploads
          </h3>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Waste Manifest Photos */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-2">
              Waste Manifest Photos
            </label>
            <div className="flex gap-2 mb-3">
              <label className="flex-1">
                <input
                  ref={wastePhotoRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      handlePhotoUpload(e.target.files, "waste");
                    }
                  }}
                  disabled={uploadingPhotos === "waste" || !report.id}
                  className="hidden"
                />
                <div className="w-full px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  <Upload size={16} />
                  {uploadingPhotos === "waste" ? "Uploading..." : "Upload Waste Photos"}
                </div>
              </label>
            </div>
            {report.wasteManifestPhotos && report.wasteManifestPhotos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {report.wasteManifestPhotos.map((photo: any, idx: number) => {
                  const url = typeof photo === "string" ? photo : photo.url;
                  return (
                    <div
                      key={url || idx}
                      className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 group"
                    >
                      <img
                        src={url}
                        alt="Waste manifest"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleDeletePhoto(url, "waste")}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Trash2 size={16} className="text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Project Photos */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-2">
              Project Photos
            </label>
            <div className="flex gap-2 mb-3">
              <label className="flex-1">
                <input
                  ref={projectPhotoRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      handlePhotoUpload(e.target.files, "project");
                    }
                  }}
                  disabled={uploadingPhotos === "project" || !report.id}
                  className="hidden"
                />
                <div className="w-full px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  <Upload size={16} />
                  {uploadingPhotos === "project" ? "Uploading..." : "Upload Project Photos"}
                </div>
              </label>
            </div>
            {report.projectPhotos && report.projectPhotos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {report.projectPhotos.map((photo: any, idx: number) => {
                  const url = typeof photo === "string" ? photo : photo.url;
                  return (
                    <div
                      key={url || idx}
                      className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 group"
                    >
                      <img
                        src={url}
                        alt="Project photo"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleDeletePhoto(url, "project")}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Trash2 size={16} className="text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => saveReport("draft")}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          Save Draft
        </button>
        <button
          onClick={() => saveReport("complete")}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#7BC143] hover:bg-[#6aae38] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={16} />
          Mark Complete
        </button>
        <button
          onClick={() => window.open(`/api/meth-decon-report/${report.id}/pdf`, "_blank")}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
        >
          <Download size={16} />
          Export PDF
        </button>
      </div>
    </div>
  );
}
