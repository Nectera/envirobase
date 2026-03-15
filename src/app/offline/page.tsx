"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

export default function OfflinePage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff size={32} className="text-slate-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          {t("offline.title")}
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          {t("offline.description")}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm"
        >
          <RefreshCw size={16} />
          {t("offline.tryAgain")}
        </button>
        <p className="text-xs text-slate-400 mt-8">{process.env.NEXT_PUBLIC_COMPANY_NAME || "EnviroBase Environmental Services"}</p>
      </div>
    </div>
  );
}
