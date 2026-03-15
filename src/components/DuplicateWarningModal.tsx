"use client";

import { AlertTriangle, X, User, Building2, FileText, ExternalLink, Plus, ArrowRight } from "lucide-react";
import { DuplicateMatch } from "@/hooks/useDuplicateCheck";

type Props = {
  matches: DuplicateMatch[];
  entityType: "lead" | "contact" | "company";
  onUseExisting: (match: DuplicateMatch) => void;
  onAddNewLead?: (match: DuplicateMatch) => void; // Only for leads — create new lead under existing contact/company
  onCreateAnyway: () => void;
  onClose: () => void;
};

const TYPE_ICONS: Record<string, any> = {
  lead: FileText,
  contact: User,
  company: Building2,
};

const MATCH_BADGE_COLORS: Record<string, string> = {
  email: "bg-blue-100 text-blue-700",
  phone: "bg-green-100 text-green-700",
  name: "bg-purple-100 text-purple-700",
  "name (exact)": "bg-purple-100 text-purple-700",
  "name (similar)": "bg-amber-100 text-amber-700",
};

export default function DuplicateWarningModal({
  matches,
  entityType,
  onUseExisting,
  onAddNewLead,
  onCreateAnyway,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[20px] shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-800">
              Potential Duplicates Found
            </h3>
            <p className="text-xs text-slate-500">
              {matches.length} existing {matches.length === 1 ? "record matches" : "records match"} what you&apos;re entering
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Match list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3">
          <div className="space-y-2">
            {matches.map((match) => {
              const Icon = TYPE_ICONS[match.type] || FileText;
              return (
                <div
                  key={match.id}
                  className="border border-slate-200 rounded-xl p-3 hover:border-amber-300 transition"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">{match.name}</div>
                      {match.subtitle && (
                        <div className="text-xs text-slate-500 truncate">{match.subtitle}</div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {match.email && (
                          <span className="text-[10px] text-slate-400">{match.email}</span>
                        )}
                        {match.email && match.phone && (
                          <span className="text-[10px] text-slate-300">|</span>
                        )}
                        {match.phone && (
                          <span className="text-[10px] text-slate-400">{match.phone}</span>
                        )}
                      </div>
                      {/* Matched fields badges */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {match.matchedFields.map((field) => (
                          <span
                            key={field}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              MATCH_BADGE_COLORS[field] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            Matched: {field}
                          </span>
                        ))}
                      </div>
                      {/* Action buttons for this match */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => onUseExisting(match)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
                        >
                          <ExternalLink size={11} />
                          View Existing
                        </button>
                        {entityType === "lead" && onAddNewLead && (match.contactId || match.companyId) && (
                          <button
                            onClick={() => onAddNewLead(match)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition"
                          >
                            <Plus size={11} />
                            New Lead Under This {match.contactName ? "Contact" : "Company"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <button
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onCreateAnyway}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-full transition"
          >
            Create Anyway
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
