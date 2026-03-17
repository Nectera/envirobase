"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";
import PricingSettings from "./PricingSettings";

export default function EstimatesHeader({
  estimateCount,
  consultationCount,
}: {
  estimateCount: number;
  consultationCount: number;
}) {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("estimates.title")}</h1>
            <p className="text-sm text-slate-500">
              {estimateCount} {t("estimates.estimatesCount")} · {consultationCount} {t("estimates.consultationsCount")}
            </p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            title={t("estimates.pricingSettings")}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        <Link
          href="/estimates/consultation"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition"
        >
          {t("estimates.newConsultationEstimate")}
        </Link>
      </div>
      <PricingSettings open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
