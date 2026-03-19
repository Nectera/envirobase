"use client";

import React from "react";
import { FeatureKey, FEATURE_LABELS, FEATURE_MIN_PLAN, hasFeature } from "@/lib/feature-flags";

interface FeatureGateProps {
  feature: FeatureKey;
  features: Record<string, boolean> | null | undefined;
  /** What to render when the feature IS enabled */
  children: React.ReactNode;
  /** "hide" removes it entirely, "blur" shows a locked overlay (default: hide) */
  mode?: "hide" | "blur";
}

/**
 * Conditionally renders children based on whether the org's plan
 * includes the required feature.
 *
 * Usage:
 *   <FeatureGate feature="chat" features={session.user.features}>
 *     <ChatWidget />
 *   </FeatureGate>
 */
export default function FeatureGate({
  feature,
  features,
  children,
  mode = "hide",
}: FeatureGateProps) {
  const enabled = hasFeature(features, feature);

  if (enabled) return <>{children}</>;

  if (mode === "hide") return null;

  // "blur" mode — show a locked overlay
  const label = FEATURE_LABELS[feature];
  const minPlan = FEATURE_MIN_PLAN[feature];

  return (
    <div className="relative rounded-lg overflow-hidden">
      <div className="pointer-events-none blur-sm opacity-40 select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/60 rounded-lg">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center max-w-sm shadow-xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-white font-semibold text-lg mb-1">{label}</h3>
          <p className="text-gray-400 text-sm mb-4">
            This feature requires the{" "}
            <span className="text-yellow-400 font-medium capitalize">{minPlan}</span>{" "}
            plan or higher.
          </p>
          <a
            href="/settings?tab=billing"
            className="inline-block px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-lg text-sm transition-colors"
          >
            Upgrade Plan
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook version for conditional logic in components
 */
export function useFeatureEnabled(
  features: Record<string, boolean> | null | undefined,
  feature: FeatureKey
): boolean {
  return hasFeature(features, feature);
}
