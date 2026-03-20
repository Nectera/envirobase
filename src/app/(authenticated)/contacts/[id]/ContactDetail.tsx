"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, User, Mail, Phone, Building2, MapPin, Target, Send, MessageSquare, FileText, Shield, Smartphone,
  Pencil, Check, X, Loader2,
} from "lucide-react";
import ActivityFeed from "@/components/ActivityFeed";
import NotesTab from "@/components/NotesTab";
import EmailCompose from "@/components/EmailCompose";
import ClickToCall from "@/components/ClickToCall";
import SMSCompose from "@/components/SMSCompose";
import PandaDocSend from "@/components/PandaDocSend";
import { useTranslation } from "@/components/LanguageProvider";
import CallConfirmModal from "@/components/CallConfirmModal";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const OFFICE_LABEL: Record<string, string> = {
  greeley: "Greeley (Front Range)",
  grand_junction: "Grand Junction (Western Slope)",
};

const SOURCE_LABEL: Record<string, string> = {
  referral: "Referral",
  website: "Website",
  cold_call: "Cold Call",
  repeat_client: "Repeat Client",
  insurance: "Insurance",
  property_manager: "Property Manager",
  realtor: "Realtor",
  other: "Other",
};

export default function ContactDetail({
  contact,
  activities,
  companyActivities,
  relatedLeads,
}: {
  contact: any;
  activities: any[];
  companyActivities: any[];
  relatedLeads: any[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "activity">("details");
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [showSMSCompose, setShowSMSCompose] = useState(false);
  const [showPandaDoc, setShowPandaDoc] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState<{ phone: string; name: string } | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contactData, setContactData] = useState(contact);
  const [editForm, setEditForm] = useState({
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    title: contact.title || "",
    email: contact.email || "",
    phone: contact.phone || "",
    mobile: contact.mobile || "",
    address: contact.address || "",
    city: contact.city || "",
    state: contact.state || "",
    zip: contact.zip || "",
    notes: contact.notes || "",
    locationNotes: contact.locationNotes || "",
    source: contact.source || "",
    referralSource: contact.referralSource || "",
    insuranceCarrier: contact.insuranceCarrier || "",
    claimNumber: contact.claimNumber || "",
    adjusterName: contact.adjusterName || "",
    adjusterContact: contact.adjusterContact || "",
  });

  const startEdit = useCallback(() => {
    setEditForm({
      firstName: contactData.firstName || "",
      lastName: contactData.lastName || "",
      title: contactData.title || "",
      email: contactData.email || "",
      phone: contactData.phone || "",
      mobile: contactData.mobile || "",
      address: contactData.address || "",
      city: contactData.city || "",
      state: contactData.state || "",
      zip: contactData.zip || "",
      notes: contactData.notes || "",
      locationNotes: contactData.locationNotes || "",
      source: contactData.source || "",
      referralSource: contactData.referralSource || "",
      insuranceCarrier: contactData.insuranceCarrier || "",
      claimNumber: contactData.claimNumber || "",
      adjusterName: contactData.adjusterName || "",
      adjusterContact: contactData.adjusterContact || "",
    });
    setEditing(true);
  }, [contactData]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const saveEdit = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setContactData({ ...contactData, ...updated });
      setEditing(false);
      router.refresh();
    } catch {
      alert(t("contacts.failedSave"));
    } finally {
      setSaving(false);
    }
  }, [contactData, editForm, router, t]);

  const updateField = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const linkedActivities = companyActivities.map((a: any) => ({
    ...a,
    _linkedFrom: contactData.company?.name || "Company",
  }));

  const hasAddress = contactData.address || contactData.city || contactData.state;
  const hasInsurance = contactData.isInsuranceJob;
  const hasReferral = contactData.source || contactData.referralSource || contactData.referredForTesting;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/contacts"
          className="text-sm text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-3"
        >
          <ArrowLeft size={14} /> {t("contacts.title")}
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <User size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{[contactData.firstName, contactData.lastName].filter(Boolean).join(" ") || contactData.name}</h1>
            {contactData.title && (
              <p className="text-sm text-slate-500">{contactData.title}</p>
            )}
          </div>
          {contactData.primary && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
              Primary
            </span>
          )}
          {contactData.office && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {OFFICE_LABEL[contactData.office] || contactData.office}
            </span>
          )}
          <div className="flex gap-2 ml-auto">
            {contactData.phone && (
              <button
                onClick={() => setShowSMSCompose(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageSquare size={12} /> SMS
              </button>
            )}
            {contactData.email && (
              <button
                onClick={() => setShowEmailCompose(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Send size={12} /> {t("email.sendEmail")}
              </button>
            )}
            {contactData.email && (
              <button
                onClick={() => setShowPandaDoc(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
              >
                <FileText size={12} /> {t("pandadoc.sendDocument")}
              </button>
            )}
          </div>
        </div>
        {contactData.company && (
          <Link
            href={`/companies/${contactData.company.id}`}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Building2 size={14} /> {contactData.company.name}
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab("details")}
          className={`pb-3 text-sm font-medium transition-colors ${
            activeTab === "details"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t("common.details")}
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`pb-3 text-sm font-medium transition-colors ${
            activeTab === "notes"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Notes
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`pb-3 text-sm font-medium transition-colors ${
            activeTab === "activity"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t("activity.title")} ({activities.length + companyActivities.length})
        </button>
      </div>

      {/* Details Tab */}
      {activeTab === "details" && (
        <div>
          {/* Edit / Save / Cancel bar */}
          <div className="flex items-center justify-end gap-2 mb-4">
            {editing ? (
              <>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  <X size={14} /> {t("common.cancel")}
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#7BC143] rounded-lg hover:bg-[#6aad38] transition disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {t("common.save")}
                </button>
              </>
            ) : (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
              >
                <Pencil size={14} /> {t("common.edit")}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Info */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Contact Information
              </h3>
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">First Name</label>
                      <input type="text" value={editForm.firstName} onChange={(e) => updateField("firstName", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Last Name</label>
                      <input type="text" value={editForm.lastName} onChange={(e) => updateField("lastName", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">{t("contacts.title")}</label>
                    <input type="text" value={editForm.title} onChange={(e) => updateField("title", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">{t("contacts.email")}</label>
                    <input type="email" value={editForm.email} onChange={(e) => updateField("email", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">{t("contacts.phone")}</label>
                    <input type="tel" value={editForm.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Mobile</label>
                    <input type="tel" value={editForm.mobile} onChange={(e) => updateField("mobile", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">{t("common.notes")}</label>
                    <textarea value={editForm.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143] resize-y" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {contactData.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={14} className="text-slate-400" />
                      <span className="text-slate-700">{contactData.email}</span>
                    </div>
                  )}
                  {contactData.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-slate-400" />
                      <button onClick={() => setShowCallConfirm({ phone: contactData.phone!, name: [contactData.firstName, contactData.lastName].filter(Boolean).join(" ") || contactData.name })} className="text-slate-700 hover:text-blue-600 transition">{contactData.phone}</button>
                      <ClickToCall phoneNumber={contactData.phone} parentType="contact" parentId={contactData.id} contactName={[contactData.firstName, contactData.lastName].filter(Boolean).join(" ") || contactData.name} />
                    </div>
                  )}
                  {contactData.mobile && (
                    <div className="flex items-center gap-2 text-sm">
                      <Smartphone size={14} className="text-slate-400" />
                      <button onClick={() => setShowCallConfirm({ phone: contactData.mobile!, name: [contactData.firstName, contactData.lastName].filter(Boolean).join(" ") || contactData.name })} className="text-slate-700 hover:text-blue-600 transition">{contactData.mobile}</button>
                      <span className="text-[10px] text-slate-400">Mobile</span>
                    </div>
                  )}
                  {contactData.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 size={14} className="text-slate-400" />
                      <Link href={`/companies/${contactData.company.id}`} className="text-indigo-600 hover:text-indigo-700">
                        {contactData.company.name}
                      </Link>
                    </div>
                  )}
                  {contactData.source && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[11px] text-slate-400 mb-1">Source</div>
                      <div className="text-sm text-slate-700">
                        {SOURCE_LABEL[contactData.source] || contactData.source}
                        {contactData.referralSource && ` — ${contactData.referralSource}`}
                      </div>
                    </div>
                  )}
                  {contactData.notes && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[11px] text-slate-400 mb-1">{t("common.notes")}</div>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap">{contactData.notes}</div>
                    </div>
                  )}
                  {!contactData.email && !contactData.phone && !contactData.mobile && !contactData.notes && (
                    <p className="text-sm text-slate-400">No contact information on file</p>
                  )}
                </div>
              )}
            </div>

            {/* Address / Location */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Location
              </h3>
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Street Address</label>
                    <input type="text" value={editForm.address} onChange={(e) => updateField("address", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">City</label>
                      <input type="text" value={editForm.city} onChange={(e) => updateField("city", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">State</label>
                      <input type="text" value={editForm.state} onChange={(e) => updateField("state", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ZIP Code</label>
                    <input type="text" value={editForm.zip} onChange={(e) => updateField("zip", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Location Notes</label>
                    <textarea value={editForm.locationNotes} onChange={(e) => updateField("locationNotes", e.target.value)} rows={2} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143] resize-y" />
                  </div>
                </div>
              ) : hasAddress ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin size={14} className="text-slate-400 mt-0.5" />
                    <div>
                      {contactData.address && <div className="text-slate-700">{contactData.address}</div>}
                      {(contactData.city || contactData.state) && (
                        <div className="text-slate-700">
                          {[contactData.city, contactData.state].filter(Boolean).join(", ")}
                          {contactData.zip && ` ${contactData.zip}`}
                        </div>
                      )}
                    </div>
                  </div>
                  {contactData.locationNotes && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[11px] text-slate-400 mb-1">Location Notes</div>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap">{contactData.locationNotes}</div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No address on file</p>
              )}
            </div>

            {/* Insurance Information */}
            {(hasInsurance || editing) && (
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Shield size={14} className="text-slate-400" />
                  Insurance Information
                </h3>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Insurance Carrier</label>
                      <input type="text" value={editForm.insuranceCarrier} onChange={(e) => updateField("insuranceCarrier", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Claim #</label>
                      <input type="text" value={editForm.claimNumber} onChange={(e) => updateField("claimNumber", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Adjuster Name</label>
                      <input type="text" value={editForm.adjusterName} onChange={(e) => updateField("adjusterName", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Adjuster Contact</label>
                      <input type="text" value={editForm.adjusterContact} onChange={(e) => updateField("adjusterContact", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {contactData.insuranceCarrier && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Carrier</span>
                        <span className="text-slate-800 font-medium">{contactData.insuranceCarrier}</span>
                      </div>
                    )}
                    {contactData.claimNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Claim #</span>
                        <span className="text-slate-800 font-medium">{contactData.claimNumber}</span>
                      </div>
                    )}
                    {contactData.adjusterName && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Adjuster</span>
                        <span className="text-slate-800 font-medium">{contactData.adjusterName}</span>
                      </div>
                    )}
                    {contactData.adjusterContact && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Adjuster Contact</span>
                        <span className="text-slate-800 font-medium">{contactData.adjusterContact}</span>
                      </div>
                    )}
                    {contactData.dateOfLoss && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date of Loss</span>
                        <span className="text-slate-800 font-medium">{formatDate(contactData.dateOfLoss)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Referral & Testing */}
            {(contactData.referredForTesting || contactData.referralSource || editing) && (
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  Referral & Testing
                </h3>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Source</label>
                      <select value={editForm.source} onChange={(e) => updateField("source", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143] bg-white">
                        <option value="">None</option>
                        {Object.entries(SOURCE_LABEL).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Referral Source</label>
                      <input type="text" value={editForm.referralSource} onChange={(e) => updateField("referralSource", e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {contactData.referralSource && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Referred By</span>
                        <span className="text-slate-800 font-medium">{contactData.referralSource}</span>
                      </div>
                    )}
                    {contactData.referredForTesting && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Referred for Testing</span>
                        <span className="text-slate-800 font-medium">{contactData.referredTestingTo || "Yes"}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Related Leads */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                {t("sidebar.leads")} ({relatedLeads.length})
              </h3>
              {relatedLeads.length > 0 ? (
                <div className="space-y-2">
                  {relatedLeads.map((lead: any) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Lead"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {lead.status?.replace(/_/g, " ")} — {lead.projectType}
                        </div>
                      </div>
                      <Target size={14} className="text-slate-400" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No related leads</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <NotesTab entityType="contact" entityId={contactData.id} />
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <ActivityFeed
          parentType="contact"
          parentId={contactData.id}
          activities={activities}
          linkedActivities={linkedActivities}
        />
      )}

      <EmailCompose
        isOpen={showEmailCompose}
        onClose={() => setShowEmailCompose(false)}
        defaultTo={contactData.email || ""}
        recipientName={[contactData.firstName, contactData.lastName].filter(Boolean).join(" ") || contactData.name}
        parentType="contact"
        parentId={contactData.id}
      />

      <SMSCompose
        isOpen={showSMSCompose}
        onClose={() => setShowSMSCompose(false)}
        defaultTo={contactData.phone || ""}
        recipientName={[contactData.firstName, contactData.lastName].filter(Boolean).join(" ") || contactData.name}
        parentType="contact"
        parentId={contactData.id}
      />

      <PandaDocSend
        isOpen={showPandaDoc}
        onClose={() => setShowPandaDoc(false)}
        contactEmail={contactData.email || ""}
        contactName={[contactData.firstName, contactData.lastName].filter(Boolean).join(" ") || contactData.name}
        parentType="contact"
        parentId={contactData.id}
        documentName={`Document - ${[contactData.firstName, contactData.lastName].filter(Boolean).join(" ") || contactData.name}`}
      />
      {showCallConfirm && (
        <CallConfirmModal
          phoneNumber={showCallConfirm.phone}
          contactName={showCallConfirm.name}
          onConfirm={() => { const phone = showCallConfirm.phone; setShowCallConfirm(null); window.location.href = `tel:${phone}`; }}
          onCancel={() => setShowCallConfirm(null)}
        />
      )}
    </div>
  );
}
