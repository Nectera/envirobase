"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, X, Building2, Loader2, Check } from "lucide-react";

interface Company {
  id: string;
  name: string;
  type?: string;
  city?: string;
}

interface ReferralSourcePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ReferralSourcePicker({
  value,
  onChange,
  placeholder = "Select referral source...",
  className = "",
}: ReferralSourcePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyType, setNewCompanyType] = useState("referral_partner");
  const [savingNew, setSavingNew] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.map((c: any) => ({
          id: c.id,
          name: c.name || "",
          type: c.type || "",
          city: c.city || "",
        })));
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNewForm(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open && !showNewForm) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open, showNewForm]);

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (companyName: string) => {
    onChange(companyName);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const handleCreateNew = async () => {
    if (!newCompanyName.trim()) return;
    setSavingNew(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCompanyName.trim(),
          type: newCompanyType,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        // Add to local list and select it
        setCompanies((prev) => [...prev, { id: created.id, name: created.name || newCompanyName.trim(), type: newCompanyType }]);
        onChange(newCompanyName.trim());
        setNewCompanyName("");
        setShowNewForm(false);
        setOpen(false);
      }
    } catch {} finally {
      setSavingNew(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Display button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-left hover:border-slate-300 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
      >
        <Building2 size={14} className="text-slate-400 flex-shrink-0" />
        {value ? (
          <span className="flex-1 text-slate-800 truncate">{value}</span>
        ) : (
          <span className="flex-1 text-slate-400">{placeholder}</span>
        )}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          {!showNewForm ? (
            <>
              {/* Search + add new */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100">
                <Search size={14} className="text-slate-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search companies..."
                  className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400 min-w-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowNewForm(true);
                    setNewCompanyName(search);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex-shrink-0"
                  title="Add new source company"
                >
                  <Plus size={13} /> New
                </button>
              </div>

              {/* Results */}
              <div className="max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={16} className="animate-spin text-slate-400" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-slate-400">No companies found</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewForm(true);
                        setNewCompanyName(search);
                      }}
                      className="mt-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      + Add &ldquo;{search || "new company"}&rdquo;
                    </button>
                  </div>
                ) : (
                  filtered.map((company) => {
                    const isSelected = value === company.name;
                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => handleSelect(company.name)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                          isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                        }`}>
                          {isSelected ? <Check size={13} /> : <Building2 size={13} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                            {company.name}
                          </p>
                          {(company.type || company.city) && (
                            <p className="text-[10px] text-slate-400 truncate">
                              {[company.type, company.city].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* New company form */
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-700">Add New Source Company</h4>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Company name"
                autoFocus
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
              <select
                value={newCompanyType}
                onChange={(e) => setNewCompanyType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                <option value="referral_partner">Referral Partner</option>
                <option value="insurance">Insurance</option>
                <option value="general_contractor">General Contractor</option>
                <option value="property_management">Property Management</option>
                <option value="testing_lab">Testing Lab</option>
                <option value="government">Government</option>
                <option value="client">Client</option>
                <option value="other">Other</option>
              </select>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={!newCompanyName.trim() || savingNew}
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition"
                >
                  {savingNew ? "Adding..." : "Add & Select"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
