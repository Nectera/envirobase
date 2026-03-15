"use client";

import { useTranslation } from "@/components/LanguageProvider";

export default function ProjectsHeader() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t("projects.title")}</h1>
        <p className="text-sm text-slate-500">{t("projects.subtitle")}</p>
      </div>
    </div>
  );
}
