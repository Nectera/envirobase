"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, ArrowRight, Loader2 } from "lucide-react";

export default function BonusPoolWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);
    fetch(`/api/bonus-pool?month=${month}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
  });

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-purple-50 flex-shrink-0">
            <Gift size={16} className="text-purple-600" />
          </div>
          <div>
            <Loader2 size={14} className="animate-spin text-slate-300" />
          </div>
        </div>
      </div>
    );
  }

  const pool = data?.poolAmount || 0;
  const hoursSaved = data?.totalHoursSaved || 0;

  return (
    <Link href="/bonus-pool" className="block">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-sm transition">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-purple-50 flex-shrink-0">
            <Gift size={16} className="text-purple-600" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-purple-600">{fmt(pool)}</div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider leading-tight">
              {monthLabel} Bonus Pool
            </div>
            {hoursSaved > 0 && (
              <div className="text-[10px] text-slate-400 mt-0.5">
                {hoursSaved.toFixed(1)} hrs saved
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
