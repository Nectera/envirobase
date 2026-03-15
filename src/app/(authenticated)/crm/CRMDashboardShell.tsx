"use client";

import { useState, useEffect } from "react";
import CRMDashboardClient from "./CRMDashboardClient";

/**
 * Client-only shell for the CRM Dashboard.
 * Prevents hydration mismatches by only rendering the dashboard
 * after the component mounts in the browser.
 */
export default function CRMDashboardShell(props: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 bg-slate-200 rounded w-48 mb-2" />
            <div className="h-4 bg-slate-100 rounded w-64" />
          </div>
          <div className="h-9 bg-slate-100 rounded-full w-56" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-72" />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-72" />
        </div>
      </div>
    );
  }

  return <CRMDashboardClient {...props} />;
}
