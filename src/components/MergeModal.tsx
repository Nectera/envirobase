"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2, AlertTriangle, GitMerge } from "lucide-react";

interface MergeModalProps {
  /** "company" or "contact" — determines API endpoints and labels */
  entityType: "company" | "contact";
  /** ID of the record being kept (primary) */
  primaryId: string;
  /** Display name of the primary record */
  primaryName: string;
  onClose: () => void;
  onMerged: () => void;
}

interface SearchResult {
  id: string;
  name: string;
  subtitle?: string;
}

export default function MergeModal({
  entityType,
  primaryId,
  primaryName,
  onClose,
  onMerged,
}: MergeModalProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState("");

  const label = entityType === "company" ? "Company" : "Contact";
  const plural = entityType === "company" ? "companies" : "contacts";
  const searchEndpoint = `/api/${plural}`;
  const mergeEndpoint = `/api/${plural}/${primaryId}/merge`;

  // Debounced search
  const doSearch = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`${searchEndpoint}?search=${encodeURIComponent(q)}`);
        const data = await res.json();
        const items: any[] = Array.isArray(data) ? data : data.items || [];
        setResults(
          items
            .filter((item: any) => item.id !== primaryId)
            .slice(0, 10)
            .map((item: any) => ({
              id: item.id,
              name:
                item.name ||
                [item.firstName, item.lastName].filter(Boolean).join(" ") ||
                "Unnamed",
              subtitle:
                entityType === "company"
                  ? [item.city, item.state].filter(Boolean).join(", ")
                  : item.email || item.phone || item.company?.name || "",
            }))
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [searchEndpoint, primaryId, entityType]
  );

  useEffect(() => {
    const timer = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search, doSearch]);

  const handleMerge = async () => {
    if (!selected) return;
    setMerging(true);
    setError("");
    try {
      const res = await fetch(mergeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secondaryId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Merge failed");
        return;
      }
      onMerged();
    } catch {
      setError("Network error");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Merge {label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-600">
            Search for a duplicate {label.toLowerCase()} to merge into{" "}
            <strong>{primaryName}</strong>. All records from the duplicate will
            be moved here, and the duplicate will be deleted.
          </p>

          {/* Search */}
          {!selected ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${plural}...`}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 animate-spin" />
                )}
              </div>
              {results.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-900">
                        {r.name}
                      </div>
                      {r.subtitle && (
                        <div className="text-xs text-slate-500">{r.subtitle}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {search.length >= 2 && !searching && results.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">
                  No matches found
                </p>
              )}
            </>
          ) : (
            /* Confirmation */
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">This cannot be undone.</p>
                    <p>
                      All leads, estimates, invoices, activities, notes, and
                      messages from <strong>{selected.name}</strong> will be
                      moved to <strong>{primaryName}</strong>, then{" "}
                      <strong>{selected.name}</strong> will be permanently
                      deleted.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 text-sm">
                <div>
                  <div className="text-slate-500">Merging</div>
                  <div className="font-medium text-slate-900">
                    {selected.name}
                  </div>
                </div>
                <div className="text-slate-400">→</div>
                <div className="text-right">
                  <div className="text-slate-500">Into</div>
                  <div className="font-medium text-slate-900">
                    {primaryName}
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
          {selected ? (
            <>
              <button
                onClick={() => { setSelected(null); setError(""); }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleMerge}
                disabled={merging}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {merging ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GitMerge className="w-4 h-4" />
                )}
                {merging ? "Merging..." : "Merge & Delete Duplicate"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
