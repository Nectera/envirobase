"use client";

import { useState } from "react";
import { UserPlus, X, Users, Mail, CheckCircle, AlertCircle, Pencil, Trash2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLES = [
  { value: "TECHNICIAN", label: "Technician", desc: "Field crew — schedule, time clock, tasks" },
  { value: "OFFICE", label: "Office", desc: "CRM, leads, pipeline, estimates" },
  { value: "SUPERVISOR", label: "Supervisor", desc: "Projects, field work, schedule" },
  { value: "PROJECT_MANAGER", label: "Project Manager", desc: "PM sections, calendar, workers — no CRM or budget" },
  { value: "ADMIN", label: "Admin", desc: "Full access + admin" },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  PROJECT_MANAGER: "bg-indigo-100 text-indigo-700",
  SUPERVISOR: "bg-blue-100 text-blue-700",
  OFFICE: "bg-amber-100 text-amber-700",
  TECHNICIAN: "bg-green-100 text-green-700",
};

export default function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TECHNICIAN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function openCreate() {
    setEditingUser(null);
    setName("");
    setEmail("");
    setRole("TECHNICIAN");
    setShowModal(true);
    setError("");
    setSuccess("");
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setShowModal(true);
    setError("");
    setSuccess("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create user");
        setLoading(false);
        return;
      }

      setUsers([data.user, ...users]);
      setShowModal(false);
      setName("");
      setEmail("");
      setRole("TECHNICIAN");

      if (data.welcomeEmailSent) {
        setSuccess(`${data.user.name} has been created and a welcome email was sent to ${data.user.email}`);
      } else {
        setSuccess(`${data.user.name} has been created, but the welcome email could not be sent. ${data.emailError || ""}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update user");
        setLoading(false);
        return;
      }

      setUsers(users.map((u) => (u.id === editingUser.id ? data.user : u)));
      setShowModal(false);
      setEditingUser(null);
      setSuccess(`${data.user.name} has been updated successfully`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete user");
        setLoading(false);
        setDeleteTarget(null);
        return;
      }

      setUsers(users.filter((u) => u.id !== deleteTarget.id));
      setSuccess(`${deleteTarget.name} has been removed`);
      setDeleteTarget(null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Users className="w-7 h-7 text-slate-600" />
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">{users.length} users in the system</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#7BC143] hover:bg-[#6aad38] text-white text-sm rounded-full font-medium flex items-center gap-2 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {success && (
        <div className="mb-4 flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {error && !showModal && !deleteTarget && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-800">{user.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {user.email}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[user.role] || "bg-slate-100 text-slate-700"}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit user"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setDeleteTarget(user); setError(""); }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingUser ? "Edit User" : "Add New User"}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingUser(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingUser ? handleUpdate : handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  placeholder="john@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none bg-white"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.desc}
                    </option>
                  ))}
                </select>
              </div>

              {!editingUser && (
                <div className="bg-blue-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-blue-700">
                    A welcome email with a temporary password will be sent to this user automatically.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingUser(null); }}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-medium text-sm rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[#7BC143] hover:bg-[#6aad38] text-white font-medium text-sm rounded-lg transition disabled:opacity-50"
                >
                  {loading ? (editingUser ? "Saving..." : "Creating...") : (editingUser ? "Save Changes" : "Create User")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Delete User</h2>
              </div>
              <p className="text-sm text-slate-600 mb-1">
                Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
              </p>
              <p className="text-xs text-slate-500 mb-6">
                This will permanently remove their account ({deleteTarget.email}). This action cannot be undone.
              </p>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-medium text-sm rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg transition disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Delete User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
