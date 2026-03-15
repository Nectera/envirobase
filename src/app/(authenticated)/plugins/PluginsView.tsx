"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle,
  ExternalLink,
  Unlink,
  Search,
  Puzzle,
  X,
  AlertTriangle,
  Link2,
  PhoneCall,
  FileText,
  DollarSign,
  Cloud,
  CreditCard,
  BookOpen,
  MessageSquare,
  Zap,
} from "lucide-react";
import {
  PLUGINS,
  PLUGIN_CATEGORIES,
  type PluginDefinition,
  type PluginCategory,
} from "@/lib/plugins";
import { logger } from "@/lib/logger";

// Icon mapping for plugin slugs
function getPluginIcon(slug: string) {
  const map: Record<string, any> = {
    quickbooks: Link2,
    "quickbooks-desktop": Cloud,
    xero: BookOpen,
    freshbooks: CreditCard,
    ringcentral: PhoneCall,
    vonage: MessageSquare,
    twilio: Zap,
    pandadoc: FileText,
    docusign: FileText,
    gusto: DollarSign,
    adp: DollarSign,
    paychex: DollarSign,
  };
  return map[slug] || Puzzle;
}

interface PluginStatus {
  slug: string;
  connected: boolean;
  comingSoon: boolean;
  connectedAt?: string;
  companyName?: string;
  phoneNumber?: string;
}

export default function PluginsView() {
  const [statuses, setStatuses] = useState<PluginStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory | "all">("all");
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // PandaDoc API key input
  const [pdApiKey, setPdApiKey] = useState("");

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const res = await fetch("/api/plugins/status");
      const data = await res.json();
      setStatuses(data.statuses || []);
    } catch (err) {
      logger.error("Failed to fetch plugin statuses:", { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (slug: string): PluginStatus | undefined =>
    statuses.find((s) => s.slug === slug);

  const handleConnect = async (plugin: PluginDefinition) => {
    setActionLoading(plugin.slug);
    try {
      if (plugin.authType === "oauth" && plugin.authRoute) {
        const res = await fetch(`/api/${plugin.authRoute}`);
        const data = await res.json();
        if (data.error) {
          alert(data.error);
          setActionLoading(null);
          return;
        }
        window.location.href = data.authUri;
        return;
      }

      if (plugin.authType === "connector" && plugin.slug === "quickbooks-desktop") {
        const res = await fetch(`/api/${plugin.statusRoute}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "connect" }),
        });
        const data = await res.json();
        if (data.error) {
          alert(data.error);
        } else {
          await fetchStatuses();
        }
        setActionLoading(null);
        return;
      }

      if (plugin.authType === "api_key" && plugin.slug === "pandadoc") {
        if (!pdApiKey.trim()) {
          alert("Please enter your PandaDoc API key");
          setActionLoading(null);
          return;
        }
        const res = await fetch(`/api/${plugin.statusRoute}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: pdApiKey.trim() }),
        });
        const data = await res.json();
        if (data.error) {
          alert(data.error);
        } else {
          await fetchStatuses();
          setPdApiKey("");
        }
        setActionLoading(null);
        return;
      }
    } catch {
      alert(`Failed to connect ${plugin.name}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (plugin: PluginDefinition) => {
    if (!confirm(`Disconnect ${plugin.name}? Related features will be disabled.`)) return;
    setActionLoading(plugin.slug);
    try {
      await fetch(`/api/${plugin.statusRoute}`, { method: "DELETE" });
      await fetchStatuses();
    } catch {
      alert(`Failed to disconnect ${plugin.name}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Check URL params for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("qb") === "connected") {
      setExpandedPlugin("quickbooks");
      fetchStatuses();
    }
    if (params.get("rc") === "connected") {
      setExpandedPlugin("ringcentral");
      fetchStatuses();
    }
    if (params.get("pandadoc") === "connected") {
      setExpandedPlugin("pandadoc");
      fetchStatuses();
    }
    if (params.get("gusto") === "connected") {
      setExpandedPlugin("gusto");
      fetchStatuses();
    }
  }, []);

  const filteredPlugins = PLUGINS.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Object.entries(PLUGIN_CATEGORIES);
  const connectedCount = statuses.filter((s) => s.connected).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Puzzle className="w-6 h-6 text-[#7BC143]" />
            Plug-ins
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {connectedCount} connected &middot; {PLUGINS.filter((p) => !p.comingSoon).length} available
          </p>
        </div>
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plug-ins..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#7BC143] bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedCategory === "all"
              ? "bg-[#7BC143] text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {categories.map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key as PluginCategory)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === key
                ? "bg-[#7BC143] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlugins.map((plugin) => {
          const status = getStatus(plugin.slug);
          const isConnected = status?.connected || false;
          const isExpanded = expandedPlugin === plugin.slug;
          const isLoading = actionLoading === plugin.slug;
          const Icon = getPluginIcon(plugin.slug);

          return (
            <div
              key={plugin.slug}
              className={`bg-white border rounded-2xl transition-all ${
                isConnected
                  ? "border-green-200 shadow-sm"
                  : plugin.comingSoon
                  ? "border-slate-100 opacity-60"
                  : "border-slate-200 shadow-sm hover:shadow-md"
              }`}
            >
              {/* Card Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${plugin.iconColor}`}
                    >
                      <Icon className={`w-5 h-5 ${plugin.iconTextColor}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{plugin.name}</h3>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                        {PLUGIN_CATEGORIES[plugin.category].label}
                      </span>
                    </div>
                  </div>
                  {isConnected && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Connected
                    </span>
                  )}
                  {plugin.comingSoon && (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-3">{plugin.description}</p>

                {/* Connected Info */}
                {isConnected && status && (
                  <div className="text-xs text-green-600 mb-3 space-y-0.5">
                    {status.companyName && <p>Company: <strong>{status.companyName}</strong></p>}
                    {status.phoneNumber && <p>Phone: <strong>{status.phoneNumber}</strong></p>}
                    {status.connectedAt && (
                      <p>Since {new Date(status.connectedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {!plugin.comingSoon && (
                  <div className="flex gap-2">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => setExpandedPlugin(isExpanded ? null : plugin.slug)}
                          className="flex-1 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          {isExpanded ? "Hide Details" : "Details"}
                        </button>
                        <button
                          onClick={() => handleDisconnect(plugin)}
                          disabled={isLoading}
                          className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Unlink className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setExpandedPlugin(isExpanded ? null : plugin.slug)}
                        className={`flex-1 px-3 py-2 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${plugin.brandColor} ${plugin.brandHoverColor}`}
                      >
                        Set Up
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Detail Panel */}
              {isExpanded && !plugin.comingSoon && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-4">
                  <p className="text-xs text-slate-600">{plugin.longDescription}</p>

                  {/* Features */}
                  <div>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      Features
                    </h4>
                    <ul className="space-y-1">
                      {plugin.features.map((f, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <CheckCircle className="w-3 h-3 text-[#7BC143] mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Setup Steps (if not connected) */}
                  {!isConnected && plugin.setupSteps.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Setup
                      </h4>
                      <ol className="space-y-1">
                        {plugin.setupSteps.map((step, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* PandaDoc API Key Input */}
                  {!isConnected && plugin.slug === "pandadoc" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={pdApiKey}
                        onChange={(e) => setPdApiKey(e.target.value)}
                        placeholder="Paste your PandaDoc API key..."
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  )}

                  {/* Connect / Dev Portal */}
                  <div className="flex gap-2">
                    {!isConnected && (
                      <button
                        onClick={() => handleConnect(plugin)}
                        disabled={isLoading}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${plugin.brandColor} ${plugin.brandHoverColor}`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5" />
                        )}
                        Connect
                      </button>
                    )}
                    {plugin.devPortalUrl && (
                      <a
                        href={plugin.devPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Dev Portal
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredPlugins.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Puzzle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No plug-ins match your search.</p>
        </div>
      )}
    </div>
  );
}
