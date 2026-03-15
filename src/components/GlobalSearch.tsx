"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, FolderOpen, Users, User, Building2,
  CheckSquare, MessageSquare, Loader2,
} from "lucide-react";

interface SearchResult {
  type: "project" | "lead" | "contact" | "company" | "task" | "message";
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  href: string;
}

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  project: { icon: FolderOpen, label: "Project", color: "text-indigo-600 bg-indigo-50" },
  lead: { icon: Users, label: "Lead", color: "text-green-600 bg-green-50" },
  contact: { icon: User, label: "Contact", color: "text-blue-600 bg-blue-50" },
  company: { icon: Building2, label: "Company", color: "text-purple-600 bg-purple-50" },
  task: { icon: CheckSquare, label: "Task", color: "text-amber-600 bg-amber-50" },
  message: { icon: MessageSquare, label: "Chat", color: "text-slate-600 bg-slate-100" },
};

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(result.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const showDropdown = open && (query.length >= 2 || results.length > 0);

  return (
    <div className="relative flex-1 max-w-md" ref={containerRef}>
      {/* Search input */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
          open
            ? "border-indigo-300 bg-white shadow-sm ring-2 ring-indigo-500/20"
            : "border-slate-200 bg-slate-50/80 hover:bg-white hover:border-slate-300"
        }`}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Search size={15} className="text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search everything..."
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none min-w-0"
        />
        {loading && <Loader2 size={14} className="animate-spin text-slate-400" />}
        {query && !loading && (
          <button
            onClick={(e) => { e.stopPropagation(); setQuery(""); setResults([]); }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 rounded border border-slate-200">
          ⌘K
        </kbd>
      </div>

      {/* Results dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50 max-h-[420px] overflow-y-auto">
          {results.length === 0 && !loading && query.length >= 2 && (
            <div className="px-4 py-8 text-center">
              <Search size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {results.length === 0 && loading && (
            <div className="px-4 py-6 text-center">
              <Loader2 size={20} className="mx-auto animate-spin text-slate-400" />
            </div>
          )}

          {results.length > 0 && (
            <div className="py-1">
              {results.map((result, i) => {
                const config = TYPE_CONFIG[result.type] || TYPE_CONFIG.project;
                const Icon = config.icon;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      i === selectedIndex ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
