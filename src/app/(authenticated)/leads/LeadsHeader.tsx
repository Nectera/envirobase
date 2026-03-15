"use client";

import Link from "next/link";
import { useTranslation } from "@/components/LanguageProvider";

export default function LeadsHeader({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t("leads.title")}</h1>
        <p className="text-sm text-slate-500">{count} {t("leads.totalLeads")}</p>
      </div>
      <Link
        href="/leads/new"
        className="px-4 py-2 bg-[#7BC143] hover:bg-[#6aad38] text-white text-sm rounded-full font-medium transition"
      >
        + {t("leads.newLead")}
      </Link>
    </div>
  );
}
