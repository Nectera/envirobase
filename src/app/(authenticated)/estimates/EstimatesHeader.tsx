"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import PricingSettings from "./PricingSettings";

export default function EstimatesHeader({
  estimateCount,
  consultationCount,
}: {
  estimateCount: number;
  consultationCount: number;
}) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Estimates</h1>
            <p className="text-sm text-slate-500">
              {estimateCount} estimates · {consultationCount} consultations
            </p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            title="Pricing Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        <Link
          href="/estimates/consultation"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition"
        >
          + Consultation Estimate
        </Link>
      </div>
      <PricingSettings open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
