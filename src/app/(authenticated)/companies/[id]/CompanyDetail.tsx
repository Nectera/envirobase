"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, Activity, Plus, ChevronRight, Mail, Phone, Badge, Send, Pencil, X, Trash2 } from "lucide-react";
import ActivityFeed from "@/components/ActivityFeed";
import EmailCompose from "@/components/EmailCompose";
import ClickToCall from "@/components/ClickToCall";
import NotesTab from "@/components/NotesTab";

const COMPANY_TYPES = [
  { value: "property_mgmt", label: "Property Management" },
  { value: "school_district", label: "School District" },
  { value: "insurance", label: "Insurance" },
  { value: "general_contractor", label: "General Contractor" },
  { value: "homeowner", label: "Homeowner" },
  { value: "government", label: "Government" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

interface Contact {
  id: string;
  name: string;
  title: string;
  email?: string;
  phone?: string;
  primary: boolean;
}

interface Lead {
  id: string;
  title: string;
  description: string;
  status: string;
  amount: number;
  source: string;
  createdAt: string;
  updatedAt: string;
  estimates: any[];
}

interface Company {
  id: string;
  name: string;
  type?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  notes?: string | null;
  referralFeeEnabled?: boolean;
  referralFeePercent?: number | null;
  contacts: Contact[];
  leads: Lead[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: "Lead", color: "bg-blue-100 text-blue-800" },
  new: { label: "New", color: "bg-blue-100 text-blue-800" },
  contacted: { label: "Contacted", color: "bg-sky-100 text-sky-800" },
  proposal_sent: { label: "Proposal Sent", color: "bg-amber-100 text-amber-800" },
  site_visit: { label: "Site Visit", color: "bg-purple-100 text-purple-800" },
  estimate_sent: { label: "Estimate Sent", color: "bg-indigo-100 text-indigo-800" },
  negotiation: { label: "Negotiation", color: "bg-orange-100 text-orange-800" },
  won: { label: "Won", color: "bg-green-100 text-green-800" },
  lost: { label: "Lost", color: "bg-red-100 text-red-800" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-800" },
};

export default function CompanyDetail({
  company,
  activities,
  linkedActivities = [],
}: {
  company: Company;
  activities: any[];
  linkedActivities?: any[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"contacts" | "leads" | "activity" | "notes">("contacts");
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: company.name || "",
    type: company.type || "commercial",
    address: company.address || "",
    city: company.city || "",
    state: company.state || "",
    zip: company.zip || "",
    phone: company.phone || "",
    email: company.email || "",
    website: company.website || "",
    notes: company.notes || "",
    referralFeeEnabled: company.referralFeeEnabled || false,
    referralFeePercent: company.referralFeePercent ?? 10,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const openEditModal = () => {
    setEditForm({
      name: company.name || "",
      type: company.type || "commercial",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      zip: company.zip || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      notes: company.notes || "",
      referralFeeEnabled: company.referralFeeEnabled || false,
      referralFeePercent: company.referralFeePercent ?? 10,
    });
    setEditError("");
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setEditError("Company name is required.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "Failed to update company.");
        return;
      }
      setShowEditModal(false);
      router.refresh();
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditSaving(false);
    }
  };

  const openEmailTo = (email: string, name: string) => {
    setEmailTo(email);
    setEmailRecipient(name);
    setShowEmailCompose(true);
  };

  return (
    <div>
      {/* Edit & Delete Buttons */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={async () => {
            const contactCount = company.contacts?.length || 0;
            const leadCount = company.leads?.length || 0;
            const warn = contactCount + leadCount > 0
              ? `This company has ${contactCount} contact(s) and ${leadCount} lead(s). They won't be deleted but will be unlinked.\n\n`
              : "";
            if (!confirm(`${warn}Are you sure you want to delete "${company.name}"? This cannot be undone.`)) return;
            setDeleting(true);
            try {
              const res = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
              if (res.ok) {
                router.push("/companies");
              } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Failed to delete company");
              }
            } catch {
              alert("Failed to delete company");
            } finally {
              setDeleting(false);
            }
          }}
          disabled={deleting}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-white border border-red-200 rounded-full hover:bg-red-50 transition disabled:opacity-50"
        >
          <Trash2 size={14} />
          {deleting ? "Deleting..." : "Delete"}
        </button>
        <button
          onClick={openEditModal}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition"
        >
          <Pencil size={14} />
          Edit Company
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-8 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("contacts")}
          className={`pb-3 font-medium text-sm transition-colors ${
            activeTab === "contacts"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            Contacts ({company.contacts.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("leads")}
          className={`pb-3 font-medium text-sm transition-colors ${
            activeTab === "leads"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={18} />
            Leads ({company.leads.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`pb-3 font-medium text-sm transition-colors ${
            activeTab === "activity"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity size={18} />
            Activity ({activities.length + linkedActivities.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`pb-3 font-medium text-sm transition-colors ${
            activeTab === "notes"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2">
            Notes
          </div>
        </button>
      </div>

      {/* Contacts Tab */}
      {activeTab === "contacts" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium flex items-center gap-2 transition-colors">
              <Plus size={18} />
              Add Contact
            </button>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Primary</th>
                </tr>
              </thead>
              <tbody>
                {company.contacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                      No contacts yet
                    </td>
                  </tr>
                ) : (
                  company.contacts.map((contact: any) => (
                    <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/contacts/${contact.id}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                          {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{contact.title}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {contact.email ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Mail size={14} className="text-slate-400" />
                              {contact.email}
                            </div>
                            <button
                              onClick={() => openEmailTo(contact.email!, [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name)}
                              className="p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition"
                              title="Send email"
                            >
                              <Send size={12} />
                            </button>
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {contact.phone ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Phone size={14} className="text-slate-400" />
                              <a href={`tel:${contact.phone}`} className="hover:text-blue-600 transition">{contact.phone}</a>
                            </div>
                            <ClickToCall phoneNumber={contact.phone} parentType="company" parentId={company.id} contactName={[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name} size="sm" />
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        {contact.primary && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                            <Badge size={12} />
                            Primary
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === "leads" && (
        <div>
          {company.leads.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
              <TrendingUp size={40} className="mx-auto mb-2 opacity-30" />
              <p>No leads for this company yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {company.leads.map((lead) => {
                const statusInfo = STATUS_LABELS[lead.status] || { label: lead.status, color: "bg-gray-100 text-gray-800" };
                return (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="block bg-white rounded-lg border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900">{lead.title}</h3>
                      <ChevronRight size={20} className="text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-600 mb-4">{lead.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3">
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-semibold">{lead.source}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-900">${lead.amount?.toLocaleString() || 0}</div>
                        <div className="text-xs text-slate-500">Estimated value</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab — now uses shared ActivityFeed with creation form */}
      {activeTab === "activity" && (
        <ActivityFeed
          parentType="company"
          parentId={company.id}
          activities={activities}
          linkedActivities={linkedActivities}
        />
      )}

      {activeTab === "notes" && (
        <NotesTab entityType="company" entityId={company.id} />
      )}

      <EmailCompose
        isOpen={showEmailCompose}
        onClose={() => setShowEmailCompose(false)}
        defaultTo={emailTo}
        recipientName={emailRecipient}
        parentType="company"
        parentId={company.id}
      />

      {/* Edit Company Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Edit Company</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  autoFocus
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                >
                  {COMPANY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                />
              </div>

              {/* City / State / Zip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Zip</label>
                  <input
                    type="text"
                    value={editForm.zip}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, zip: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  />
                </div>
              </div>

              {/* Phone / Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                />
              </div>

              {/* Referral Fee */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">Referral Fee Required</label>
                  <button
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, referralFeeEnabled: !prev.referralFeeEnabled }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${editForm.referralFeeEnabled ? "bg-[#7BC143]" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editForm.referralFeeEnabled ? "translate-x-5" : ""}`} />
                  </button>
                </div>
                {editForm.referralFeeEnabled && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fee Percentage</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={editForm.referralFeePercent}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, referralFeePercent: parseFloat(e.target.value) || 0 }))}
                        className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                      />
                      <span className="text-sm text-slate-500">% of estimate total</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none resize-none"
                />
              </div>

              {editError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{editError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 text-sm bg-[#7BC143] text-white rounded-full hover:bg-[#6aad38] disabled:opacity-50 font-medium"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
