"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  HardHat,
  FolderOpen,
  Loader2,
  Search,
  Plus,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Activity,
} from "lucide-react";

interface Org {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  createdAt: string;
  _count: {
    users: number;
    workers: number;
    projects: number;
    leads: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  trialing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pro: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const PLAN_PRICES: Record<string, number> = {
  starter: 599,
  pro: 799,
  enterprise: 0,
};

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const isPlatformAdmin = (session?.user as any)?.isPlatformAdmin;

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isPlatformAdmin === false) {
      router.replace("/dashboard");
      return;
    }
  }, [isPlatformAdmin, router]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    fetch("/api/organizations")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load organizations");
        return r.json();
      })
      .then((data) => {
        setOrgs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [isPlatformAdmin]);

  if (!isPlatformAdmin) return null;

  const filtered = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase())
  );

  const activeOrgs = orgs.filter((o) => o.status === "active" || o.status === "trialing");
  const totalUsers = orgs.reduce((sum, o) => sum + o._count.users, 0);
  const mrr = activeOrgs.reduce((sum, o) => sum + (PLAN_PRICES[o.plan] || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white">Platform Admin</h1>
            <p className="text-sm text-slate-400 mt-1">Manage tenants, plans, and platform health</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Organizations</span>
            </div>
            <p className="text-2xl font-bold text-white">{activeOrgs.length}</p>
            <p className="text-xs text-slate-500 mt-1">{orgs.length} total</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalUsers}</p>
            <p className="text-xs text-slate-500 mt-1">across all orgs</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">MRR</span>
            </div>
            <p className="text-2xl font-bold text-white">${mrr.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">monthly recurring</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Plans</span>
            </div>
            <div className="flex gap-3 mt-1">
              {["starter", "pro", "enterprise"].map((plan) => {
                const count = activeOrgs.filter((o) => o.plan === plan).length;
                return (
                  <div key={plan} className="text-center">
                    <p className="text-lg font-bold text-white">{count}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{plan}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizations..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
            />
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading organizations...
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Org List */}
        {!loading && !error && (
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {search ? "No organizations match your search" : "No organizations yet"}
              </div>
            ) : (
              filtered.map((org) => (
                <Link
                  key={org.id}
                  href={`/admin/orgs/${org.id}`}
                  className="flex items-center gap-4 p-4 bg-slate-900/60 border border-slate-800/60 rounded-xl hover:border-slate-700 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-white text-sm truncate">{org.name}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded border ${STATUS_COLORS[org.status] || STATUS_COLORS.active}`}>
                        {org.status}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded border ${PLAN_COLORS[org.plan] || PLAN_COLORS.starter}`}>
                        {org.plan}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{org.slug} &bull; Joined {new Date(org.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400">
                    <div className="flex items-center gap-1" title="Users">
                      <Users className="w-3.5 h-3.5" /> {org._count.users}
                    </div>
                    <div className="flex items-center gap-1" title="Workers">
                      <HardHat className="w-3.5 h-3.5" /> {org._count.workers}
                    </div>
                    <div className="flex items-center gap-1" title="Projects">
                      <FolderOpen className="w-3.5 h-3.5" /> {org._count.projects}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
