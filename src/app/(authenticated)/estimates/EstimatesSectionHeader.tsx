"use client";

import { useTranslation } from "@/components/LanguageProvider";

export default function EstimatesSectionHeader() {
  const { t } = useTranslation();

  return (
    <h2 className="text-sm font-semibold text-slate-700 mb-3">
      {t("estimates.estimatesSection")}
    </h2>
  );
}
