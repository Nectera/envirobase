"use client";

import { useState, useRef } from "react";
import { Plus, X, Trash2, Award, Upload, FileText, ExternalLink } from "lucide-react";

interface Cert {
  id: string;
  name: string;
  number: string | null;
  issued: string | null;
  expires: string | null;
  status: string;
  fileUrl: string | null;
  fileName: string | null;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    const date = new Date(d.length === 10 ? d + "T12:00:00" : d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "bg-green-100 text-green-700";
    case "expiring_soon": return "bg-yellow-100 text-yellow-700";
    case "expired": return "bg-red-100 text-red-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export default function CertificationsSection({
  workerId,
  initialCerts,
}: {
  workerId: string;
  initialCerts: Cert[];
}) {
  const [certs, setCerts] = useState<Cert[]>(initialCerts);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", number: "", issued: "", expires: "" });
  const [formFile, setFormFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const resetForm = () => {
    setForm({ name: "", number: "", issued: "", expires: "" });
    setFormFile(null);
    setShowForm(false);
  };

  const uploadFile = async (certId: string, file: File): Promise<{ fileUrl: string; fileName: string } | null> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/workers/${workerId}/certifications/${certId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Upload failed");
      return null;
    } catch {
      alert("Upload failed");
      return null;
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.expires) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workers/${workerId}/certifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        let cert = await res.json();

        // Upload file if one was selected
        if (formFile) {
          const fileResult = await uploadFile(cert.id, formFile);
          if (fileResult) {
            cert = { ...cert, fileUrl: fileResult.fileUrl, fileName: fileResult.fileName };
          }
        }

        setCerts((prev) => [...prev, cert]);
        resetForm();
      }
    } catch (err) {
      console.error("Failed to add certification:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (certId: string) => {
    if (!confirm("Delete this certification?")) return;
    setDeleting(certId);
    try {
      const res = await fetch(`/api/workers/${workerId}/certifications/${certId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCerts((prev) => prev.filter((c) => c.id !== certId));
      }
    } catch (err) {
      console.error("Failed to delete certification:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleUploadToExisting = async (certId: string, file: File) => {
    setUploading(certId);
    try {
      const result = await uploadFile(certId, file);
      if (result) {
        setCerts((prev) =>
          prev.map((c) =>
            c.id === certId ? { ...c, fileUrl: result.fileUrl, fileName: result.fileName } : c
          )
        );
      }
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 mb-6">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Certifications</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{certs.length} total</span>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {showForm ? <X size={12} /> : <Plus size={12} />}
            {showForm ? "Cancel" : "Add Certification"}
          </button>
        </div>
      </div>

      {/* Add Certification Form */}
      {showForm && (
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Certification Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Asbestos Inspector"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Certificate Number
              </label>
              <input
                type="text"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder="e.g. CERT-12345"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={form.issued}
                onChange={(e) => setForm({ ...form, issued: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Expiration Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.expires}
                onChange={(e) => setForm({ ...form, expires: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="mt-3">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Attach Certificate (PDF or image, max 10MB)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                <Upload size={12} />
                {formFile ? "Change File" : "Choose File"}
              </button>
              {formFile && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <FileText size={12} className="text-indigo-500" />
                  <span className="truncate max-w-[200px]">{formFile.name}</span>
                  <button
                    onClick={() => setFormFile(null)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFormFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={handleAdd}
              disabled={saving || !form.name || !form.expires}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Add Certification"}
            </button>
          </div>
        </div>
      )}

      {/* Certifications Table */}
      {certs.length > 0 ? (
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Certification</th>
                <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Number</th>
                <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Issued</th>
                <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Expires</th>
                <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Status</th>
                <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">File</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-[13px]">{c.name}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-600">{c.number || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{formatDate(c.issued)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{formatDate(c.expires)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded capitalize ${getStatusColor(c.status)}`}>
                      {c.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {uploading === c.id ? (
                      <span className="text-[11px] text-slate-400">Uploading...</span>
                    ) : c.fileUrl ? (
                      <a
                        href={c.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 font-medium"
                        title={c.fileName || "View certificate"}
                      >
                        <FileText size={12} />
                        <span className="truncate max-w-[80px]">{c.fileName || "View"}</span>
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <>
                        <button
                          onClick={() => uploadInputRefs.current[c.id]?.click()}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 font-medium transition"
                        >
                          <Upload size={12} />
                          Attach
                        </button>
                        <input
                          ref={(el) => { uploadInputRefs.current[c.id] = el; }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadToExisting(c.id, file);
                            e.target.value = "";
                          }}
                        />
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                      className="text-slate-300 hover:text-red-500 transition disabled:opacity-50"
                      title="Delete certification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !showForm ? (
        <div className="p-5 text-center">
          <Award size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No certifications on file</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus size={12} /> Add Certification
          </button>
        </div>
      ) : null}
    </div>
  );
}
