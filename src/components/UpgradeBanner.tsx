"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FEATURE_LABELS, FEATURE_MIN_PLAN, type FeatureKey } from "@/lib/feature-flags";

/**
 * Shows a dismissible upgrade prompt when the user is redirected
 * from a feature-gated route (via ?upgrade=featureKey).
 */
export default function UpgradeBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [featureKey, setFeatureKey] = useState<string | null>(null);

  useEffect(() => {
    const upgrade = searchParams.get("upgrade");
    if (upgrade && upgrade in FEATURE_LABELS) {
      setFeatureKey(upgrade);
      // Clean the URL without triggering a navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("upgrade");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  if (!featureKey) return null;

  const label = FEATURE_LABELS[featureKey as FeatureKey] || featureKey;
  const minPlan = FEATURE_MIN_PLAN[featureKey as FeatureKey] || "pro";

  return (
    <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-yellow-900">
            {label} requires the <span className="capitalize">{minPlan}</span> plan
          </p>
          <p className="text-sm text-yellow-700">
            Upgrade your plan to unlock this feature and more.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href="/settings?tab=billing"
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          Upgrade
        </a>
        <button
          onClick={() => setFeatureKey(null)}
          className="p-2 text-yellow-600 hover:text-yellow-800 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
