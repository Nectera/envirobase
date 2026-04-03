"use client";

import { useState, useEffect } from "react";
import { Plus, X, Save, Trash2, Star, Upload, Loader2, AlertCircle, Check } from "lucide-react";

type ServiceType = "ASBESTOS" | "LEAD" | "METH" | "MOLD" | "SELECT_DEMO";

interface PastProject {
  id: string;
  serviceType: ServiceType;
  name: string;
  description: string;
  location: string;
  squareFeet: number;
  completionDate: string;
  testimonial: string;
  featured: boolean;
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
}

interface Photo {
  id: string;
  pastProjectId: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

interface ProjectFormData {
  serviceType: ServiceType;
  name: string;
  description: string;
  location: string;
  squareFeet: string;
  completionDate: string;
  testimonial: string;
}

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  ASBESTOS: "Asbestos Abatement",
  LEAD: "Lead Paint",
  METH: "Meth Decon",
  MOLD: "Mold Remediation",
  SELECT_DEMO: "Selective Demolition",
};

const SERVICE_TYPE_COLORS: Record<ServiceType, string> = {
  ASBESTOS: "bg-purple-100 text-purple-800",
  LEAD: "bg-orange-100 text-orange-800",
  METH: "bg-red-100 text-red-800",
  MOLD: "bg-teal-100 text-teal-800",
  SELECT_DEMO: "bg-blue-100 text-blue-800",
};

const ALL_SERVICE_TYPES: ServiceType[] = ["ASBESTOS", "LEAD", "METH", "MOLD", "SELECT_DEMO"];

export default function PastProjectsPage() {
  const [projects, setProjects] = useState<PastProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ServiceType | "ALL">("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    serviceType: "ASBESTOS",
    name: "",
    description: "",
    location: "",
    squareFeet: "",
    completionDate: "",
    testimonial: "",
  });
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [photoUploadingId, setPhotoUploadingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/past-projects");
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjects(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = activeFilter === "ALL" ? projects : projects.filter((p) => p.serviceType === activeFilter);

  const handleAddProject = () => {
    setEditingId(null);
    setFormData({
      serviceType: "ASBESTOS",
      name: "",
      description: "",
      location: "",
      squareFeet: "",
      completionDate: "",
      testimonial: "",
    });
    setShowAddModal(true);
  };

  const handleEditProject = (project: PastProject) => {
    setEditingId(project.id);
    setFormData({
      serviceType: project.serviceType,
      name: project.name,
      description: project.description,
      location: project.location,
      squareFeet: project.squareFeet?.toString() || "",
      completionDate: project.completionDate,
      testimonial: project.testimonial,
    });
    setShowAddModal(true);
  };

  const handleSaveProject = async () => {
    if (!formData.name.trim()) {
      setError("Project name is required");
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/past-projects/${editingId}` : "/api/past-projects";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: formData.serviceType,
          name: formData.name,
          description: formData.description,
          location: formData.location,
          squareFeet: formData.squareFeet ? parseInt(formData.squareFeet) : null,
          completionDate: formData.completionDate,
          testimonial: formData.testimonial,
        }),
      });

      if (!res.ok) throw new Error("Failed to save project");

      setShowAddModal(false);
      setSavedMessage(editingId ? "Project updated" : "Project created");
      setTimeout(() => setSavedMessage(null), 3000);
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/past-projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete project");
      setDeleteConfirm(null);
      setSavedMessage("Project deleted");
      setTimeout(() => setSavedMessage(null), 3000);
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  const handleToggleFeatured = async (project: PastProject) => {
    try {
      const res = await fetch(`/api/past-projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...project, featured: !project.featured }),
      });
      if (!res.ok) throw new Error("Failed to update project");
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    }
  };

  const handlePhotoUpload = async (projectId: string, file: File) => {
    try {
      setPhotoUploadingId(projectId);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/past-projects/${projectId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload photo");
      setSavedMessage("Photo uploaded");
      setTimeout(() => setSavedMessage(null), 3000);
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setPhotoUploadingId(null);
    }
  };

  const handleDeletePhoto = async (projectId: string, photoId: string) => {
    try {
      const res = await fetch(`/api/past-projects/${projectId}/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete photo");
      setSavedMessage("Photo deleted");
      setTimeout(() => setSavedMessage(null), 3000);
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    }
  };

  const handleSetPrimaryPhoto = async (projectId: string, photoId: string) => {
    try {
      const res = await fetch(`/api/past-projects/${projectId}/photos/${photoId}/primary`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed to set primary photo");
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set primary photo");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Past Projects</h1>
          <p className="text-sm text-slate-500">Manage completed projects showcased on estimate PDFs</p>
        </div>
        <button
          onClick={handleAddProject}
          className="flex items-center gap-2 bg-[#7BC143] text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-[#6aad38] transition"
        >
          <Plus size={16} />
          Add Project
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {savedMessage && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <Check size={16} className="text-emerald-600" />
          <p className="text-sm text-emerald-800">{savedMessage}</p>
        </div>
      )}

      {/* Service Type Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter("ALL")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
            activeFilter === "ALL"
              ? "bg-[#7BC143] text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {ALL_SERVICE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              activeFilter === type
                ? "bg-[#7BC143] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {SERVICE_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">
            {activeFilter === "ALL" ? "No projects yet" : `No ${SERVICE_TYPE_LABELS[activeFilter]} projects`}
          </p>
          <button
            onClick={handleAddProject}
            className="mt-2 text-[#7BC143] hover:text-[#6aad38] font-medium text-sm"
          >
            Add the first project
          </button>
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => {
            const primaryPhoto = project.photos?.find((p) => p.isPrimary);
            const otherPhotos = project.photos?.filter((p) => !p.isPrimary) || [];

            return (
              <div key={project.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden flex flex-col">
                {/* Primary Photo */}
                <div className="relative w-full h-48 bg-slate-200 overflow-hidden">
                  {primaryPhoto ? (
                    <img src={primaryPhoto.url} alt={project.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <span className="text-sm">No primary photo</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => handleToggleFeatured(project)}
                      className={`p-2 rounded-lg transition ${
                        project.featured
                          ? "bg-yellow-400 text-white"
                          : "bg-white/80 text-slate-600 hover:bg-white"
                      }`}
                      title={project.featured ? "Remove from featured" : "Mark as featured"}
                    >
                      <Star size={18} fill={project.featured ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-800 flex-1">{project.name}</h3>
                      <span className={`ml-2 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${SERVICE_TYPE_COLORS[project.serviceType]}`}>
                        {SERVICE_TYPE_LABELS[project.serviceType]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {project.location && `${project.location} • `}
                      {project.completionDate}
                    </p>
                  </div>

                  {/* Description Preview */}
                  {project.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-3">{project.description}</p>
                  )}

                  {/* Metadata */}
                  {project.squareFeet && (
                    <p className="text-xs text-slate-500 mb-3">{project.squareFeet.toLocaleString()} sq ft</p>
                  )}

                  {/* Photos Thumbnails */}
                  {otherPhotos.length > 0 && (
                    <div className="mb-3 flex gap-2 flex-wrap">
                      {otherPhotos.map((photo) => (
                        <div key={photo.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                          <img src={photo.url} alt="Project photo" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleDeletePhoto(project.id, photo.id)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded p-1 opacity-0 hover:opacity-100 transition"
                            title="Delete photo"
                          >
                            <X size={12} />
                          </button>
                          <button
                            onClick={() => handleSetPrimaryPhoto(project.id, photo.id)}
                            className="absolute bottom-1 left-1 bg-slate-700 text-white rounded p-1 opacity-0 hover:opacity-100 transition"
                            title="Set as primary"
                          >
                            <Star size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Photo Upload */}
                  <div className="mb-4 border-t border-slate-200 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handlePhotoUpload(project.id, e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        disabled={photoUploadingId === project.id}
                      />
                      <div className="flex items-center gap-2 px-2 py-1 rounded border border-slate-300 hover:border-slate-400 text-xs text-slate-600 hover:text-slate-700 transition">
                        {photoUploadingId === project.id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            Add Photo
                          </>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => handleEditProject(project)}
                      className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-xs font-medium transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(project.id)}
                      className="flex-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-xs font-medium transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingId ? "Edit Project" : "Add New Project"}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Service Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.serviceType}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceType: e.target.value as ServiceType })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7BC143]"
                >
                  {ALL_SERVICE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SERVICE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Office Building Remediation"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7BC143]"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Denver, CO"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7BC143]"
                />
              </div>

              {/* Square Feet */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Square Feet</label>
                <input
                  type="number"
                  value={formData.squareFeet}
                  onChange={(e) => setFormData({ ...formData, squareFeet: e.target.value })}
                  placeholder="e.g., 15000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7BC143]"
                />
              </div>

              {/* Completion Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Completion Date
                </label>
                <input
                  type="text"
                  value={formData.completionDate}
                  onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                  placeholder="e.g., March 2024"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7BC143]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the project, challenges, and outcomes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7BC143] resize-none"
                />
              </div>

              {/* Testimonial */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Testimonial (Optional)</label>
                <textarea
                  value={formData.testimonial}
                  onChange={(e) => setFormData({ ...formData, testimonial: e.target.value })}
                  placeholder="Optional customer testimonial or quote..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7BC143] resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-3 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#7BC143] text-white rounded-lg hover:bg-[#6aad38] disabled:bg-slate-300 text-sm font-medium transition"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Delete Project</h3>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-3 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteProject(deleteConfirm);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
