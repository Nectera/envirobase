"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, User, Mail, Phone, Building2, MapPin, Target, Send, MessageSquare, FileText, Shield, Smartphone,
} from "lucide-react";
import ActivityFeed from "@/components/ActivityFeed";
import EmailCompose from "@/components/EmailCompose";
import ClickToCall from "@/components/ClickToCall";
import SMSCompose from "@/components/SMSCompose";
import PandaDocSend from "@/components/PandaDocSend";
import NotesTab from "@/components/NotesTab";
import { useTranslation } from "@/components/LanguageProvider";

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
  const [activeTab, setActiveTab] = useState<"details" | "activity" | "notes">("details");
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [showSMSCompose, setShowSMSCompose] = useState(false);
  const [showPandaDoc, setShowPandaDoc] = useState(false);

  const linkedActivities = companyActivities.map((a: any) => ({
    ...a,
    _linkedFrom: contact.company?.name || "Company",
  }));

  const hasAddress = contact.address || contact.city || contact.state;
  const hasInsurance = contact.isInsuranceJob;
  const hasReferral = contact.source || contact.referralSource || contact.referredForTesting;

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
            <h1 className="text-xl font-bold text-slate-900">{[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name}</h1>
            {contact.title && (
              <p className="text-sm text-slate-500">{contact.title}</p>
            )}
          </div>
          {contact.primary && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
              Primary
            </span>
          )}
          {contact.office && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {OFFICE_LABEL[contact.office] || contact.office}
            </span>
          )}
          <div className="flex gap-2 ml-auto">
            {contact.phone && (
              <button
                onClick={() => setShowSMSCompose(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageSquare size={12} /> SMS
              </button>
            )}
            {contact.email && (
              <button
                onClick={() => setShowEmailCompose(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Send size={12} /> {t("email.sendEmail")}
              </button>
            )}
            {contact.email && (
              <button
                onClick={() => setShowPandaDoc(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
              >
                <FileText size={12} /> {t("pandadoc.sendDocument")}
              </button>
            )}
          </div>
        </div>
        {contact.company && (
          <Link
            href={`/companies/${contact.company.id}`}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Building2 size={14} /> {contact.company.name}
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
          onClick={() => setActiveTab("activity")}
          className={`pb-3 text-sm font-medium transition-colors ${
            activeTab === "activity"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t("activity.title")} ({activities.length + companyActivities.length})
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
      </div>

      {activeTab === "notes" && (
        <NotesTab entityType="contact" entityId={contact.id} />
      )}

      {/* Details Tab */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact Info */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Contact Information
            </h3>
            <div className="space-y-3">
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-slate-400" />
                  <span className="text-slate-700">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-slate-400" />
                  <a href={`tel:${contact.phone}`} className="text-slate-700 hover:text-blue-600 transition">{contact.phone}</a>
                  <ClickToCall phoneNumber={contact.phone} parentType="contact" parentId={contact.id} contactName={[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name} />
                </div>
              )}
              {contact.mobile && (
                <div className="flex items-center gap-2 text-sm">
                  <Smartphone size={14} className="text-slate-400" />
                  <a href={`tel:${contact.mobile}`} className="text-slate-700 hover:text-blue-600 transition">{contact.mobile}</a>
                  <span className="text-[10px] text-slate-400">Mobile</span>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 size={14} className="text-slate-400" />
                  <Link
                    href={`/companies/${contact.company.id}`}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    {contact.company.name}
                  </Link>
                </div>
              )}
              {contact.source && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400 mb-1">Source</div>
                  <div className="text-sm text-slate-700">
                    {SOURCE_LABEL[contact.source] || contact.source}
                    {contact.referralSource && ` — ${contact.referralSource}`}
                  </div>
                </div>
              )}
              {contact.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400 mb-1">{t("common.notes")}</div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {contact.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Address / Location */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Location
            </h3>
            {hasAddress ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    {contact.address && <div className="text-slate-700">{contact.address}</div>}
                    {(contact.city || contact.state) && (
                      <div className="text-slate-700">
                        {[contact.city, contact.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                {contact.locationNotes && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[11px] text-slate-400 mb-1">Location Notes</div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {contact.locationNotes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No address on file</p>
            )}
          </div>

          {/* Insurance Information */}
          {hasInsurance && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Shield size={14} className="text-slate-400" />
                Insurance Information
              </h3>
              <div className="space-y-2 text-sm">
                {contact.insuranceCarrier && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Carrier</span>
                    <span className="text-slate-800 font-medium">{contact.insuranceCarrier}</span>
                  </div>
                )}
                {contact.claimNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Claim #</span>
                    <span className="text-slate-800 font-medium">{contact.claimNumber}</span>
                  </div>
                )}
                {contact.adjusterName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Adjuster</span>
                    <span className="text-slate-800 font-medium">{contact.adjusterName}</span>
                  </div>
                )}
                {contact.adjusterContact && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Adjuster Contact</span>
                    <span className="text-slate-800 font-medium">{contact.adjusterContact}</span>
                  </div>
                )}
                {contact.dateOfLoss && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date of Loss</span>
                    <span className="text-slate-800 font-medium">{formatDate(contact.dateOfLoss)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Referral & Testing */}
          {(contact.referredForTesting || contact.referralSource) && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Referral & Testing
              </h3>
              <div className="space-y-2 text-sm">
                {contact.referralSource && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Referred By</span>
                    <span className="text-slate-800 font-medium">{contact.referralSource}</span>
                  </div>
                )}
                {contact.referredForTesting && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Referred for Testing</span>
                    <span className="text-slate-800 font-medium">
                      {contact.referredTestingTo || "Yes"}
                    </span>
                  </div>
                )}
              </div>
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
                        {[lead.firstName, lead.lastName]
                          .filter(Boolean)
                          .join(" ") || "Lead"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {lead.status?.replace(/_/g, " ")} —{" "}
                        {lead.projectType}
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
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <ActivityFeed
          parentType="contact"
          parentId={contact.id}
          activities={activities}
          linkedActivities={linkedActivities}
        />
      )}

      <EmailCompose
        isOpen={showEmailCompose}
        onClose={() => setShowEmailCompose(false)}
        defaultTo={contact.email || ""}
        recipientName={[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name}
        parentType="contact"
        parentId={contact.id}
      />

      <SMSCompose
        isOpen={showSMSCompose}
        onClose={() => setShowSMSCompose(false)}
        defaultTo={contact.phone || ""}
        recipientName={[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name}
        parentType="contact"
        parentId={contact.id}
      />

      <PandaDocSend
        isOpen={showPandaDoc}
        onClose={() => setShowPandaDoc(false)}
        contactEmail={contact.email || ""}
        contactName={[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name}
        parentType="contact"
        parentId={contact.id}
        documentName={`Document - ${[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name}`}
      />
    </div>
  );
}
