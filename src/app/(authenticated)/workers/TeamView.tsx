"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { useTranslation } from "@/components/LanguageProvider";
import {
  Plus,
  Search,
  Settings,
  MoreVertical,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  X,
  Loader2,
  Phone,
  Mail,
  AlertTriangle,
  Camera,
  MapPin,
  Star,
  KeyRound,
  UserPlus,
  Shield,
  Unlink,
} from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import Pagination from "@/components/Pagination";

type TeamViewProps = {
  workers: any[];
  positions: string[];
};

const WORKER_TYPES = ["ASBESTOS", "LEAD", "METH", "MOLD", "SELECT_DEMO", "REBUILD"];
const WORKER_ROLES = ["ADMIN", "SUPERVISOR", "TECHNICIAN", "OFFICE"];

const TYPE_COLORS: Record<string, string> = {
  ASBESTOS: "bg-indigo-100 text-indigo-700",
  LEAD: "bg-amber-100 text-amber-700",
  METH: "bg-red-100 text-red-700",
  MOLD: "bg-teal-100 text-teal-700",
  SELECT_DEMO: "bg-orange-100 text-orange-700",
  REBUILD: "bg-violet-100 text-violet-700",
};

export default function TeamView({ workers: initialWorkers, positions: initialPositions }: TeamViewProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any | null>(null);
  const [positions, setPositions] = useState(initialPositions);
  const [newPosition, setNewPosition] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [createAccountWorker, setCreateAccountWorker] = useState<any | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [resetPwWorker, setResetPwWorker] = useState<any | null>(null);
  const [resetPwValue, setResetPwValue] = useState("");
  const [resetPwError, setResetPwError] = useState("");
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const WORKERS_PAGE_SIZE = 25;
  const [workersPage, setWorkersPage] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    role: "TECHNICIAN",
    phone: "",
    email: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    address: "",
    homeCity: "",
    homeState: "",
    homeZip: "",
    city: "",
    state: "",
    types: [] as string[],
    status: "active",
    skillRating: 0,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Filter and search workers
  const filteredWorkers = useMemo(() => {
    return initialWorkers.filter((worker) => {
      // Status filter
      const workerStatus = worker.status || "active";
      if (filterStatus !== "all" && workerStatus !== filterStatus) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          worker.name?.toLowerCase().includes(query) ||
          worker.email?.toLowerCase().includes(query) ||
          worker.phone?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [initialWorkers, filterStatus, searchQuery]);

  const workersTotalPages = Math.ceil(filteredWorkers.length / WORKERS_PAGE_SIZE);
  const paginatedWorkers = useMemo(() => {
    const start = (workersPage - 1) * WORKERS_PAGE_SIZE;
    return filteredWorkers.slice(start, start + WORKERS_PAGE_SIZE);
  }, [filteredWorkers, workersPage]);

  // Reset page when filters change
  useMemo(() => { setWorkersPage(1); }, [searchQuery, filterStatus]);

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      position: "",
      role: "TECHNICIAN",
      phone: "",
      email: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      address: "",
      homeCity: "",
      homeState: "",
      homeZip: "",
      city: "",
      state: "",
      types: [],
      status: "active",
      skillRating: 0,
    });
    setEditingWorker(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  }, []);

  const openAddModal = useCallback(() => {
    resetForm();
    setShowAddModal(true);
  }, [resetForm]);

  const openEditModal = useCallback((worker: any) => {
    const types: string[] = worker.types ? Array.from(new Set(worker.types.split(",").map((t: string) => t.trim().toUpperCase()).filter(Boolean))) as string[] : [];
    setFormData({
      name: worker.name || "",
      position: worker.position || "",
      role: worker.role || "TECHNICIAN",
      phone: worker.phone || "",
      email: worker.email || "",
      emergencyContactName: worker.emergencyContactName || "",
      emergencyContactPhone: worker.emergencyContactPhone || "",
      address: worker.address || "",
      homeCity: worker.homeCity || "",
      homeState: worker.homeState || "",
      homeZip: worker.homeZip || "",
      city: worker.city || "",
      state: worker.state || "",
      types,
      status: worker.status || "active",
      skillRating: worker.skillRating || 0,
    });
    setEditingWorker(worker);
    setPhotoFile(null);
    setPhotoPreview(worker.photoUrl || null);
    setShowAddModal(true);
  }, []);

  const handleFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    []
  );

  const handleTypeToggle = useCallback((type: string) => {
    setFormData((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  }, []);

  const handleStatusToggle = useCallback((checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      status: checked ? "active" : "inactive",
    }));
  }, []);

  const handleAddPositionClick = useCallback(() => {
    if (newPosition.trim() && !positions.includes(newPosition.trim())) {
      setPositions([...positions, newPosition.trim()]);
      setNewPosition("");
    }
  }, [newPosition, positions]);

  const handleRemovePosition = useCallback((pos: string) => {
    setPositions(positions.filter((p) => p !== pos));
  }, [positions]);

  const handleSavePositions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/positions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions }),
      });

      if (response.ok) {
        setShowSettingsPanel(false);
        router.refresh();
      } else {
        alert("Failed to save positions");
      }
    } catch (error) {
      logger.error("Error saving positions:", { error: String(error) });
      alert("Error saving positions");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleSubmitWorker = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    // Require email for non-technician roles
    if (formData.role !== "TECHNICIAN" && !formData.email.trim()) {
      alert("Work email is required for " + formData.role + " roles");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = editingWorker ? `/api/workers/${editingWorker.id}` : "/api/workers";
      const method = editingWorker ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const worker = await response.json();

        // Upload photo if selected
        if (photoFile) {
          const photoData = new FormData();
          photoData.append("photo", photoFile);
          await fetch(`/api/workers/${worker.id}/photo`, {
            method: "POST",
            body: photoData,
          });
        }

        setShowAddModal(false);
        resetForm();
        router.refresh();
      } else {
        alert("Failed to save worker");
      }
    } catch (error) {
      logger.error("Error saving worker:", { error: String(error) });
      alert("Error saving worker");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (workerId: string, currentStatus: string) => {
    setIsLoading(true);
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const response = await fetch(`/api/workers/${workerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setOpenActionMenu(null);
        router.refresh();
      } else {
        alert("Failed to update worker status");
      }
    } catch (error) {
      logger.error("Error toggling status:", { error: String(error) });
      alert("Error updating status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workers/${workerId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteConfirm(null);
        setOpenActionMenu(null);
        router.refresh();
      } else {
        alert("Failed to delete worker");
      }
    } catch (error) {
      logger.error("Error deleting worker:", { error: String(error) });
      alert("Error deleting worker");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!createAccountWorker) return;
    if (!accountEmail.trim() || !accountPassword.trim()) {
      setAccountError("Email and password are required");
      return;
    }
    if (accountPassword.length < 6) {
      setAccountError("Password must be at least 6 characters");
      return;
    }
    setIsLoading(true);
    setAccountError("");
    try {
      const response = await fetch(`/api/workers/${createAccountWorker.id}/create-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail, password: accountPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setCreateAccountWorker(null);
        setAccountEmail("");
        setAccountPassword("");
        router.refresh();
      } else {
        setAccountError(data.error || "Failed to create account");
      }
    } catch (error) {
      logger.error("Error creating account:", { error: String(error) });
      setAccountError("Error creating account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = async (worker: any) => {
    if (!worker.userId) return;
    if (!confirm(`Remove login account for ${worker.name}? They will no longer be able to sign in.`)) return;
    setIsLoading(true);
    try {
      // Unlink user from worker, then delete the user account
      await fetch(`/api/admin/users/${worker.userId}`, { method: "DELETE" });
      setOpenActionMenu(null);
      router.refresh();
    } catch (error) {
      logger.error("Error removing account:", { error: String(error) });
      alert("Error removing account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPwWorker?.user) {
      setResetPwError("No linked account found. Try refreshing the page.");
      return;
    }
    if (!resetPwValue.trim() || resetPwValue.length < 6) {
      setResetPwError("Password must be at least 6 characters");
      return;
    }
    setIsLoading(true);
    setResetPwError("");
    try {
      const response = await fetch(`/api/admin/users/${resetPwWorker.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPwValue }),
      });
      if (response.ok) {
        setResetPwWorker(null);
        setResetPwValue("");
        router.refresh();
        alert("Password updated successfully");
      } else {
        const data = await response.json();
        setResetPwError(data.error || "Failed to reset password");
      }
    } catch (error) {
      logger.error("Error resetting password:", { error: String(error) });
      setResetPwError("Error resetting password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!resetPwWorker?.user?.email) {
      setResetPwError("No email found for this account.");
      return;
    }
    setIsLoading(true);
    setResetPwError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetPwWorker.user.email }),
      });
      if (response.ok || response.status === 200) {
        setResetPwWorker(null);
        alert(`Password reset email sent to ${resetPwWorker.user.email}`);
      } else {
        setResetPwError("Failed to send reset email. Try again.");
      }
    } catch (error) {
      logger.error("Error sending reset email:", { error: String(error) });
      setResetPwError("Error sending reset email");
    } finally {
      setIsLoading(false);
    }
  };

  const openMenuAtButton = (e: React.MouseEvent, workerId: string) => {
    if (openActionMenu === workerId) {
      setOpenActionMenu(null);
      setMenuPosition(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuHeight = 280; // approximate height of the dropdown
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuHeight ? rect.top - menuHeight - 4 : rect.bottom + 4;
    setMenuPosition({ top: Math.max(8, top), left: rect.right - 192 });
    setOpenActionMenu(workerId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t("team.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("team.subtitle")}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSettingsPanel(true)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            title={t("common.settings")}
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("team.addMember")}
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {["all", "active", "inactive"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab as "all" | "active" | "inactive")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === tab
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t("team.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 overflow-visible">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                {t("team.tableHeaderName")}
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                {t("team.tableHeaderPosition")}
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                {t("team.tableHeaderSkill")}
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                {t("team.tableHeaderRole")}
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                {t("team.tableHeaderContact")}
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                {t("team.tableHeaderEmergency")}
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                {t("team.tableHeaderTypes")}
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                {t("team.tableHeaderStatus")}
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                {t("team.tableHeaderAccount")}
              </th>
              <th className="px-6 py-3 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                {t("team.tableHeaderActions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredWorkers.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center text-slate-500">
                  {t("team.noTeamMembers")}
                </td>
              </tr>
            ) : (
              paginatedWorkers.map((worker, rowIndex) => {
                const workerStatus = worker.status || "active";
                const workerTypes: string[] = worker.types
                  ? Array.from(new Set(worker.types.split(",").map((t: string) => t.trim().toUpperCase()).filter(Boolean))) as string[]
                  : [];

                return (
                  <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                    {/* Name */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/workers/${worker.id}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                          {worker.photoUrl ? (
                            <img src={worker.photoUrl} alt={worker.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-slate-500">
                              {worker.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {worker.name}
                          </div>
                          <div className="text-xs text-slate-500">{worker.position || worker.role}</div>
                        </div>
                      </Link>
                    </td>

                    {/* Position */}
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {worker.position || "-"}
                    </td>

                    {/* Skill Rating */}
                    <td className="px-6 py-4">
                      {(worker as any).skillRating ? (
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12} className={s <= (worker as any).skillRating ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {worker.role || "-"}
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {worker.phone || worker.email ? (
                        <div className="space-y-1">
                          {worker.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-400" />
                              {worker.phone}
                            </div>
                          )}
                          {worker.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-400" />
                              {worker.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Emergency Contact */}
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {worker.emergencyContactName ||
                      worker.emergencyContactPhone ? (
                        <div className="space-y-1">
                          {worker.emergencyContactName && (
                            <div>{worker.emergencyContactName}</div>
                          )}
                          {worker.emergencyContactPhone && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="w-4 h-4 text-slate-400" />
                              {worker.emergencyContactPhone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Types */}
                    <td className="px-6 py-4">
                      {workerTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {workerTypes.map((type: string) => (
                            <span
                              key={type}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                TYPE_COLORS[type] ||
                                "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {workerStatus === "active" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          <UserCheck className="w-3 h-3" />
                          {t("common.active")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                          <UserX className="w-3 h-3" />
                          {t("common.inactive")}
                        </span>
                      )}
                    </td>

                    {/* Account */}
                    <td className="px-6 py-4">
                      {worker.user ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                          <Shield className="w-3 h-3" />
                          {t("team.hasLogin")}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setCreateAccountWorker(worker);
                            setAccountEmail(worker.email || "");
                            setAccountPassword("");
                            setAccountError("");
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <UserPlus className="w-3 h-3" />
                          {t("team.createAccount")}
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => openMenuAtButton(e, worker.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-slate-200 text-slate-500 transition-colors"
                        disabled={isLoading}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={workersPage}
          totalPages={workersTotalPages}
          totalItems={filteredWorkers.length}
          pageSize={WORKERS_PAGE_SIZE}
          onPageChange={setWorkersPage}
        />
      </div>

      {/* Action Dropdown — fixed position so it never clips */}
      {openActionMenu && menuPosition && (() => {
        const menuWorker = initialWorkers.find((w: any) => w.id === openActionMenu);
        if (!menuWorker) return null;
        const mStatus = menuWorker.status || "active";
        return (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => { setOpenActionMenu(null); setMenuPosition(null); }} />
            <div
              className="fixed w-48 bg-white rounded-lg border border-slate-200 shadow-lg z-[70]"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              <button
                onClick={() => { openEditModal(menuWorker); setOpenActionMenu(null); setMenuPosition(null); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors border-b border-slate-200 rounded-t-lg"
                disabled={isLoading}
              >
                <Edit2 className="w-4 h-4" /> {t("team.edit")}
              </button>
              <button
                onClick={() => { handleToggleStatus(menuWorker.id, mStatus); setMenuPosition(null); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors border-b border-slate-200"
                disabled={isLoading}
              >
                {mStatus === "active" ? <><UserX className="w-4 h-4" /> {t("team.deactivate")}</> : <><UserCheck className="w-4 h-4" /> {t("team.activate")}</>}
              </button>
              {!menuWorker.user && (
                <button
                  onClick={() => {
                    setCreateAccountWorker(menuWorker);
                    setAccountEmail(menuWorker.email || "");
                    setAccountPassword("");
                    setAccountError("");
                    setOpenActionMenu(null);
                    setMenuPosition(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors border-b border-slate-200"
                  disabled={isLoading}
                >
                  <UserPlus className="w-4 h-4" /> {t("team.createAccount")}
                </button>
              )}
              {menuWorker.user && (
                <>
                  <button
                    onClick={() => {
                      setResetPwWorker(menuWorker);
                      setResetPwValue("");
                      setResetPwError("");
                      setOpenActionMenu(null);
                      setMenuPosition(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors border-b border-slate-200"
                    disabled={isLoading}
                  >
                    <KeyRound className="w-4 h-4" /> {t("team.resetPassword")}
                  </button>
                  <button
                    onClick={() => { handleRemoveAccount(menuWorker); setOpenActionMenu(null); setMenuPosition(null); }}
                    className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 transition-colors border-b border-slate-200"
                    disabled={isLoading}
                  >
                    <Unlink className="w-4 h-4" /> {t("team.deleteMember")}
                  </button>
                </>
              )}
              <button
                onClick={() => { setDeleteConfirm(menuWorker.id); setOpenActionMenu(null); setMenuPosition(null); }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors rounded-b-lg"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4" /> {t("common.delete")}
              </button>
            </div>
          </>
        );
      })()}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <h2 className="text-xl font-bold text-slate-900">
                {editingWorker ? t("team.editMember") : t("team.addMember")}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Photo Upload */}
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer text-sm font-medium">
                    <Camera className="w-4 h-4" />
                    {photoPreview ? t("team.changePhoto") : t("team.uploadPhoto")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-1">{t("team.photoFormats")}</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  {t("common.name")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder={t("team.enterFullName")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Position & Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t("workers.position")}
                  </label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t("team.selectPosition")}</option>
                    {positions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t("workers.role")}
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {WORKER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Skill Rating */}
              {["Technician", "Supervisor", "Laborer"].includes(formData.position) && (
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t("team.skillRating")}
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, skillRating: prev.skillRating === level ? 0 : level }))}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={20}
                          className={level <= formData.skillRating
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200 hover:text-amber-200"
                          }
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-slate-500">
                      {formData.skillRating === 0 && t("team.notRated")}
                      {formData.skillRating === 1 && t("team.novice")}
                      {formData.skillRating === 2 && t("team.basic")}
                      {formData.skillRating === 3 && t("team.competent")}
                      {formData.skillRating === 4 && t("team.skilled")}
                      {formData.skillRating === 5 && t("team.expert")}
                    </span>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t("team.phoneLabel")}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder={t("team.phoneLabel")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t("team.emailLabel")}
                    {formData.role !== "TECHNICIAN" && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder={formData.role !== "TECHNICIAN" ? t("team.requiredEmail") : t("team.emailPlaceholder")}
                    className={`w-full px-3 py-2 border rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formData.role !== "TECHNICIAN" && !formData.email.trim() ? "border-red-300" : "border-slate-200"
                    }`}
                    required={formData.role !== "TECHNICIAN"}
                  />
                  {formData.role !== "TECHNICIAN" && !formData.email.trim() && (
                    <p className="text-xs text-red-500 mt-1">{t("team.workEmailRequired").replace("{role}", formData.role.toLowerCase())}</p>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t("team.emergencyContactName")}
                  </label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleFormChange}
                    placeholder={t("common.name")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t("team.emergencyContactPhone")}
                  </label>
                  <input
                    type="tel"
                    name="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleFormChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Home Address */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {t("team.homeAddress")}</span>
                </label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(val) => setFormData((prev) => ({ ...prev, address: val }))}
                  onSelect={(result) => {
                    setFormData((prev) => ({
                      ...prev,
                      address: result.address,
                      homeCity: result.city || prev.homeCity,
                      homeState: result.state || prev.homeState,
                      homeZip: result.zip || prev.homeZip,
                    }));
                  }}
                  placeholder="Start typing a home address..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t("team.cityLabel")}
                  </label>
                  <input
                    type="text"
                    name="homeCity"
                    value={formData.homeCity}
                    onChange={handleFormChange}
                    placeholder={t("team.cityLabel")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t("team.stateLabel")}
                  </label>
                  <input
                    type="text"
                    name="homeState"
                    value={formData.homeState}
                    onChange={handleFormChange}
                    placeholder={t("team.stateLabel")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t("team.zipLabel")}
                  </label>
                  <input
                    type="text"
                    name="homeZip"
                    value={formData.homeZip}
                    onChange={handleFormChange}
                    placeholder={t("team.zipLabel")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Worker Types */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  {t("team.types")}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {WORKER_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.types.includes(type)}
                        onChange={() => handleTypeToggle(type)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-900">
                  {t("team.statusLabel")}
                </label>
                <button
                  onClick={() =>
                    handleStatusToggle(formData.status === "inactive")
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.status === "active"
                      ? "bg-green-600"
                      : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.status === "active" ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-600">
                  {formData.status === "active" ? t("common.active") : t("common.inactive")}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSubmitWorker}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingWorker ? t("common.update") : t("common.add")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex items-start gap-4 p-6">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {t("team.deleteMember")}
                </h3>
                <p className="text-sm text-slate-600 mt-2">
                  {t("team.deleteConfirm")}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handleDeleteWorker(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {createAccountWorker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{t("team.createLoginAccount")}</h2>
              <button
                onClick={() => { setCreateAccountWorker(null); setAccountError(""); }}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-slate-600">
                {t("team.createLoginDescription").replace("{name}", createAccountWorker.name)}
              </p>
              {accountError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {accountError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">{t("team.emailLabel")}</label>
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="user@xtractes.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">{t("team.passwordLabel")}</label>
                <input
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder={t("team.passwordPlaceholder")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => { setCreateAccountWorker(null); setAccountError(""); }}
                className="px-4 py-2 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleCreateAccount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("team.createAccount")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwWorker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{t("team.resetPassword")}</h2>
              <button
                onClick={() => { setResetPwWorker(null); setResetPwError(""); }}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-slate-600">
                {t("team.resetPasswordDescription").replace("{name}", resetPwWorker.name).replace("{email}", resetPwWorker.user?.email)}
              </p>
              {resetPwError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {resetPwError}
                </div>
              )}
              <button
                onClick={handleSendResetEmail}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-3 text-left"
                disabled={isLoading}
              >
                <Mail className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900">{t("team.sendResetEmail")}</div>
                  <div className="text-xs text-slate-500">{t("team.sendResetEmailDesc")}</div>
                </div>
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-slate-400">{t("team.orSetManually")}</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">{t("team.newPassword")}</label>
                <input
                  type="password"
                  value={resetPwValue}
                  onChange={(e) => setResetPwValue(e.target.value)}
                  placeholder={t("team.passwordPlaceholder")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => { setResetPwWorker(null); setResetPwError(""); }}
                className="px-4 py-2 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("team.setPassword")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettingsPanel && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {t("team.managePositions")}
              </h2>
              <button
                onClick={() => setShowSettingsPanel(false)}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Current Positions */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                  {t("team.currentPositions")}
                </h3>
                <div className="space-y-2">
                  {positions.length === 0 ? (
                    <p className="text-sm text-slate-500">{t("team.noPositions")}</p>
                  ) : (
                    positions.map((pos) => (
                      <div
                        key={pos}
                        className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg"
                      >
                        <span className="text-sm text-slate-900">{pos}</span>
                        <button
                          onClick={() => handleRemovePosition(pos)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          disabled={isLoading}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add New Position */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                  {t("team.addNewPosition")}
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleAddPositionClick();
                    }}
                    placeholder={t("team.positionPlaceholder")}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleAddPositionClick}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={isLoading || !newPosition.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowSettingsPanel(false)}
                className="px-4 py-2 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSavePositions}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
