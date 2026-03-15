"use client";

import { useState, useEffect } from "react";
import LeadDetail from "./LeadDetail";

export default function LeadDetailWrapper(props: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-4 bg-slate-200 rounded w-1/4" />
        <div className="h-40 bg-slate-100 rounded" />
        <div className="h-60 bg-slate-100 rounded" />
      </div>
    );
  }

  return <LeadDetail {...props} />;
}
