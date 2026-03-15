"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Plus, Search, X } from "lucide-react";
import { logger } from "@/lib/logger";

type Company = {
  id: string;
  name: string;
  type?: string;
  city?: string;
  contacts?: Contact[];
};

type Contact = {
  id: string;
  name: string;
  email?: string;
  companyId: string;
};

type Lead = {
  id: string;
  companyId: string;
  contactId?: string | null;
  projectType: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  company?: { id: string; name: string } | null;
  contact?: { id: string; name: string } | null;
};

type LineItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export default function NewEstimateForm({
  companies,
  leads,
  contacts,
  preSelectedLead,
}: {
  companies: Company[];
  leads: Lead[];
  contacts: Contact[];
  preSelectedLead?: Lead | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    companyId: preSelectedLead?.companyId || "",
    leadId: preSelectedLead?.id || "",
    contactId: preSelectedLead?.contactId || "",
    scope: "",
    lineItems: [] as LineItem[],
    laborHours: "",
    materialsCost: "",
    markupPercent: "15",
    validUntilDays: "30",
  });

  // Searchable company dropdown state
  const [companySearch, setCompanySearch] = useState(
    preSelectedLead?.company?.name || ""
  );
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);

  // Searchable lead dropdown state
  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const leadRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setShowCompanyDropdown(false);
      }
      if (leadRef.current && !leadRef.current.contains(e.target as Node)) {
        setShowLeadDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === formData.companyId) || null,
    [companies, formData.companyId]
  );

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies.slice(0, 20);
    const q = companySearch.toLowerCase();
    return companies
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.type?.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [companies, companySearch]);

  const availableContacts = formData.companyId
    ? contacts.filter((c) => c.companyId === formData.companyId)
    : [];

  const availableLeads = useMemo(() => {
    let filtered = formData.companyId
      ? leads.filter((l) => l.companyId === formData.companyId)
      : leads;
    if (leadSearch.trim()) {
      const q = leadSearch.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.projectType?.toLowerCase().includes(q) ||
          l.title?.toLowerCase().includes(q) ||
          `${l.firstName || ""} ${l.lastName || ""}`.toLowerCase().includes(q) ||
          l.company?.name?.toLowerCase().includes(q)
      );
    }
    return filtered.slice(0, 20);
  }, [leads, formData.companyId, leadSearch]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === formData.leadId) || null,
    [leads, formData.leadId]
  );

  // Calculate totals
  const lineItemsTotal = formData.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const laborTotal = (Number(formData.laborHours) || 0) * 150;
  const subtotal = lineItemsTotal + laborTotal + (Number(formData.materialsCost) || 0);
  const markupAmount = (subtotal * Number(formData.markupPercent)) / 100;
  const total = subtotal + markupAmount;

  const handleAddLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [
        ...formData.lineItems,
        { description: "", quantity: 1, unit: "each", unitPrice: 0 },
      ],
    });
  };

  const handleRemoveLineItem = (index: number) => {
    setFormData({
      ...formData,
      lineItems: formData.lineItems.filter((_, i) => i !== index),
    });
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...formData.lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, lineItems: updated });
  };

  const handleSelectCompany = (c: Company) => {
    setFormData({ ...formData, companyId: c.id, leadId: "", contactId: "" });
    setCompanySearch(c.name);
    setShowCompanyDropdown(false);
  };

  const handleClearCompany = () => {
    setFormData({ ...formData, companyId: "", leadId: "", contactId: "" });
    setCompanySearch("");
  };

  const handleSelectLead = (l: Lead) => {
    setFormData({
      ...formData,
      leadId: l.id,
      contactId: l.contactId || "",
      companyId: l.companyId || formData.companyId,
    });
    if (l.company && !formData.companyId) {
      setCompanySearch(l.company.name);
    }
    setLeadSearch("");
    setShowLeadDropdown(false);
  };

  const handleClearLead = () => {
    setFormData({ ...formData, leadId: "", contactId: "" });
    setLeadSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validUntilDate = new Date();
      validUntilDate.setDate(
        validUntilDate.getDate() + Number(formData.validUntilDays)
      );

      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: formData.companyId,
          leadId: formData.leadId || null,
          contactId: formData.contactId || null,
          scope: formData.scope,
          lineItems: formData.lineItems,
          laborHours: Number(formData.laborHours) || 0,
          materialsCost: Number(formData.materialsCost) || 0,
          markup: Number(formData.markupPercent) || 0,
          subtotal,
          total,
          validUntil: validUntilDate.toISOString().split("T")[0],
          status: "draft",
        }),
      });

      if (!res.ok) throw new Error("Failed to create estimate");
      const estimate = await res.json();
      router.push(`/estimates/${estimate.id}`);
    } catch (error) {
      logger.error("Error creating estimate:", { error: String(error) });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      <div className="space-y-6">
        {/* Company & Lead Selection */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Searchable Company */}
            <div ref={companyRef} className="relative">
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Company <span className="text-red-500">*</span>
              </label>
              {selectedCompany ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg">
                  <span className="flex-1 text-sm text-slate-900">
                    {selectedCompany.name}
                    {selectedCompany.city && (
                      <span className="text-slate-500"> — {selectedCompany.city}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearCompany}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={companySearch}
                      onChange={(e) => {
                        setCompanySearch(e.target.value);
                        setShowCompanyDropdown(true);
                      }}
                      onFocus={() => setShowCompanyDropdown(true)}
                      placeholder="Search companies..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                    />
                  </div>
                  {showCompanyDropdown && filteredCompanies.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCompanies.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCompany(c)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <div className="text-sm font-medium text-slate-900">{c.name}</div>
                          {c.city && (
                            <div className="text-xs text-slate-500">{c.city}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Searchable Lead */}
            <div ref={leadRef} className="relative">
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Lead (Optional)
              </label>
              {selectedLead ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg">
                  <span className="flex-1 text-sm text-slate-900">
                    {selectedLead.firstName && selectedLead.lastName
                      ? `${selectedLead.firstName} ${selectedLead.lastName}`
                      : selectedLead.title || selectedLead.projectType}
                    {selectedLead.company?.name && (
                      <span className="text-slate-500"> — {selectedLead.company.name}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearLead}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={leadSearch}
                      onChange={(e) => {
                        setLeadSearch(e.target.value);
                        setShowLeadDropdown(true);
                      }}
                      onFocus={() => setShowLeadDropdown(true)}
                      placeholder="Search leads..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
                    />
                  </div>
                  {showLeadDropdown && availableLeads.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {availableLeads.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => handleSelectLead(l)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <div className="text-sm font-medium text-slate-900">
                            {l.firstName && l.lastName
                              ? `${l.firstName} ${l.lastName}`
                              : l.title || l.projectType}
                          </div>
                          <div className="text-xs text-slate-500 flex gap-2">
                            {l.company?.name && <span>{l.company.name}</span>}
                            <span className="capitalize">{l.projectType}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Contact dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Contact (Optional)
            </label>
            <select
              value={formData.contactId}
              onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
              className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#7BC143] focus:border-[#7BC143] outline-none"
            >
              <option value="">No contact assigned</option>
              {availableContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scope */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Scope of Work
          </label>
          <textarea
            value={formData.scope}
            onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
            placeholder="Describe the scope of work..."
            rows={4}
            className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Line Items</h2>
            <button
              type="button"
              onClick={handleAddLineItem}
              className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition flex items-center gap-1"
            >
              <Plus size={14} /> Add Line Item
            </button>
          </div>

          {formData.lineItems.length > 0 ? (
            <div className="space-y-3">
              {formData.lineItems.map((item, i) => (
                <div key={i} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(i, "description", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Item description"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-slate-500">Qty</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(i, "quantity", Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-slate-500">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleLineItemChange(i, "unit", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="each">each</option>
                      <option value="sqft">sqft</option>
                      <option value="lf">lf</option>
                      <option value="hr">hr</option>
                      <option value="ls">ls</option>
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="text-xs text-slate-500">Unit Price</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleLineItemChange(i, "unitPrice", Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-xs text-slate-500">Total</label>
                    <div className="px-3 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200">
                      {(item.quantity * item.unitPrice).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(i)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <p className="text-sm mb-3">No line items yet</p>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition inline-flex items-center gap-1"
              >
                <Plus size={14} /> Add First Item
              </button>
            </div>
          )}
        </div>

        {/* Labor & Materials */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Labor & Materials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Labor Hours
              </label>
              <input
                type="number"
                value={formData.laborHours}
                onChange={(e) => setFormData({ ...formData, laborHours: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                min="0"
                step="0.5"
              />
              <p className="text-xs text-slate-400 mt-1">At $150/hr</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Materials Cost ($)
              </label>
              <input
                type="number"
                value={formData.materialsCost}
                onChange={(e) => setFormData({ ...formData, materialsCost: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Pricing</h2>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Line Items:</span>
              <span className="text-slate-900">
                {lineItemsTotal.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
            {laborTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Labor ({formData.laborHours} hrs):</span>
                <span className="text-slate-900">
                  {laborTotal.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
            )}
            {Number(formData.materialsCost) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Materials:</span>
                <span className="text-slate-900">
                  {Number(formData.materialsCost).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="text-slate-900 font-medium">
                {subtotal.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Markup (%)
              </label>
              <input
                type="number"
                value={formData.markupPercent}
                onChange={(e) => setFormData({ ...formData, markupPercent: e.target.value })}
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                min="0"
                step="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Valid For (days)
              </label>
              <input
                type="number"
                value={formData.validUntilDays}
                onChange={(e) => setFormData({ ...formData, validUntilDays: e.target.value })}
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                min="1"
                step="1"
              />
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-900">Total:</span>
              <span className="text-2xl font-bold text-indigo-600">
                {total.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !formData.companyId}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm rounded-lg font-medium transition"
          >
            {loading ? "Creating..." : "Create Estimate"}
          </button>
          <Link
            href="/estimates"
            className="px-4 py-2 border border-slate-200 text-slate-900 text-sm rounded-lg font-medium hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
