"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  HardHat,
  FolderOpen,
  Target,
  Loader2,
  Save,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Mail,
  Palette,
  CreditCard,
  Shield,
  Trash2,
  ExternalLink,
  Copy,
} from "lucide-react";

interface OrgDetail {
  id: string;
  slug: string;
  name: string;
  status: string;
  appName: string | null;
  companyName: string | null;
  companyShort: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  accentColor: string | null;
  supportEmail: string | null;
  companyLocation: string | null;
  domain: string | null;
  website: string | null;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  billingEmail: string | null;
  features: Record<string, boolean> | null;
  maxUsers: number;
  maxWorkers: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    workers: number;
    projects: number;
    leads: number;
  };
}

interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const STATUS_OPTIONS = ["active", "trialing", "suspended", "cancelled"];
const PLAN_OPTIONS = ["starter", "pro", "enterprise"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  trialing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const PLAN_LIMITS: Record<string, { maxUsers: number; maxWorkers: number }> = {
  starter: { maxUsers: 10, maxWorkers: 25 },
  pro: { maxUsers: 25, maxWorkers: 50 },
  enterprise: { maxUsers: 100, maxWorkers: 500 },
};

export default function OrgDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "branding" | "billing" | "users">("general");

  // Editable fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [maxUsers, setMaxUsers] = useState(0);
  const [maxWorkers, setMaxWorkers] = useState(0);
  const [appName, setAppName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyShort, setCompanyShort] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");
  const [domain, setDomain] = useState("");
  const [website, setWebsite] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  useEffect(() => {
    fetchOrg();
    fetchUsers();
  }, [orgId]);

  async function fetchOrg() {
    try {
      const res = await fetch(`/api/organizations/${orgId}`);
      if (!res.ok) throw new Error("Failed to load organization");
      const data = await res.json();
      setOrg(data);
      // Populate form
      setName(data.name || "");
      setSlug(data.slug || "");
      setStatus(data.status || "active");
      setPlan(data.plan || "starter");
      setMaxUsers(data.maxUsers || 0);
      setMaxWorkers(data.maxWorkers || 0);
      setAppName(data.appName || "");
      setCompanyName(data.companyName || "");
      setCompanyShort(data.companyShort || "");
      setSupportEmail(data.supportEmail || "");
      setCompanyLocation(data.companyLocation || "");
      setDomain(data.domain || "");
      setWebsite(data.website || "");
      setBrandColor(data.brandColor || "#7BC143");
      setAccentColor(data.accentColor || "");
      setBillingEmail(data.billingEmail || "");
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch(`/api/organizations/${orgId}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch { /* ignore */ }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          status,
          plan,
          maxUsers,
          maxWorkers,
          appName: appName || null,
          companyName: companyName || null,
          companyShort: companyShort || null,
          supportEmail: supportEmail || null,
          companyLocation: companyLocation || null,
          domain: domain || null,
          website: website || null,
          brandColor: brandColor || null,
          accentColor: accentColor || null,
          billingEmail: billingEmail || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      setSuccess("Organization updated successfully");
      fetchOrg();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSuspend() {
    if (!confirm("Are you sure you want to suspend this organization? Users will not be able to log in.")) return;
    setStatus("suspended");
    setSaving(true);
    try {
      await fetch(`/api/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "suspended" }),
      });
      setSuccess("Organization suspended");
      fetchOrg();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this organization? This is a soft delete — data is preserved.")) return;
    try {
      await fetch(`/api/organizations/${orgId}`, { method: "DELETE" });
      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handlePlanChange(newPlan: string) {
    setPlan(newPlan);
    const limits = PLAN_LIMITS[newPlan];
    if (limits) {
      setMaxUsers(limits.maxUsers);
      setMaxWorkers(limits.maxWorkers);
    }
  }

  async function handleImpersonate(userId: string) {
    // For now, copy the user ID for impersonation
    navigator.clipboard.writeText(userId);
    setSuccess("User ID copied to clipboard");
    setTimeout(() => setSuccess(""), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Organization not found</p>
          <Link href="/admin" className="text-emerald-400 hover:text-emerald-300 text-sm">
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "general" as const, label: "General" },
    { key: "branding" as const, label: "Branding" },
    { key: "billing" as const, label: "Billing" },
    { key: "users" as const, label: `Users (${org._count.users})` },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/admin"
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All Organizations
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{org.name}</h1>
                <p className="text-xs text-slate-500">{org.slug} &bull; Created {new Date(org.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${STATUS_COLORS[org.status] || STATUS_COLORS.active}`}>
                {org.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {org.status === "active" && (
              <button
                onClick={handleSuspend}
                className="px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                Suspend
              </button>
            )}
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-3 h-3 inline mr-1" />
              Cancel Org
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: "Users", value: org._count.users, max: maxUsers },
            { icon: HardHat, label: "Workers", value: org._count.workers, max: maxWorkers },
            { icon: FolderOpen, label: "Projects", value: org._count.projects },
            { icon: Target, label: "Leads", value: org._count.leads },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <stat.icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-lg font-bold text-white">
                {stat.value}
                {stat.max !== undefined && (
                  <span className="text-xs font-normal text-slate-500"> / {stat.max}</span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900/40 border border-slate-800/40 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" /> Organization Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Slug</label>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Plan</label>
                  <select
                    value={plan}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  >
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Max Users</label>
                  <input
                    type="number"
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Max Workers</label>
                  <input
                    type="number"
                    value={maxWorkers}
                    onChange={(e) => setMaxWorkers(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Location</label>
                  <input
                    value={companyLocation}
                    onChange={(e) => setCompanyLocation(e.target.value)}
                    placeholder="Fort Collins, CO"
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Website</label>
                  <input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
              </div>

              {/* Feature Flags */}
              {org.features && Object.keys(org.features).length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Feature Flags</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(org.features as Record<string, boolean>).map(([key, enabled]) => (
                      <span
                        key={key}
                        className={`px-2 py-1 text-[10px] font-medium rounded-md border ${
                          enabled
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-slate-800/60 text-slate-500 border-slate-700/30 line-through"
                        }`}
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === "branding" && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-400" /> White-Label Branding
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">App Name</label>
                  <input
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="EnviroBase"
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Company Name</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Short Name</label>
                  <input
                    value={companyShort}
                    onChange={(e) => setCompanyShort(e.target.value)}
                    placeholder="EB"
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Support Email</label>
                  <input
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="hello@example.com"
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Custom Domain</label>
                  <input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="app.yourcompany.com"
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Logo URL</label>
                  <input
                    value={org.logoUrl || ""}
                    disabled
                    className="w-full px-3 py-2 bg-slate-800/30 border border-slate-700/30 rounded-lg text-sm text-slate-500 outline-none"
                    placeholder="Not set"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandColor || "#7BC143"}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-slate-700"
                    />
                    <input
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor || "#10b981"}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-slate-700"
                    />
                    <input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" /> Billing & Subscription
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Current Plan</label>
                  <p className="text-sm text-white font-semibold capitalize">{plan}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Billing Email</label>
                  <input
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="billing@example.com"
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Stripe Customer ID</label>
                  <p className="text-sm text-slate-400 font-mono">
                    {org.stripeCustomerId || <span className="text-slate-600 italic">Not connected</span>}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Stripe Subscription ID</label>
                  <p className="text-sm text-slate-400 font-mono">
                    {org.stripeSubscriptionId || <span className="text-slate-600 italic">Not connected</span>}
                  </p>
                </div>
              </div>

              {org.trialEndsAt && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Trial Ends</label>
                  <p className="text-sm text-white">{new Date(org.trialEndsAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-slate-400" /> Organization Users
              </h3>

              {users.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No users loaded. The users API endpoint may need to be created.</p>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                          {u.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded border ${
                          u.role === "ADMIN"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : u.role === "SUPERVISOR"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : u.role === "OFFICE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          Joined {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleImpersonate(u.id)}
                          className="px-2 py-1 text-[10px] font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded hover:text-white hover:border-slate-600 transition-colors"
                          title="Copy user ID"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
