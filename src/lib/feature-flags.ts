/**
 * Feature Flag Enforcement
 *
 * Maps features to routes and provides utilities for checking
 * whether an org's plan includes a given feature.
 */

export type FeatureKey =
  | "crm"
  | "projects"
  | "scheduling"
  | "timeClock"
  | "compliance"
  | "metrics"
  | "chat"
  | "pipeline"
  | "bonusPool"
  | "contentInventory"
  | "reviewRequests"
  | "knowledgeBase"
  | "aiAssistant";

/** Routes that require a specific feature flag to be enabled */
export const FEATURE_ROUTE_MAP: Record<string, FeatureKey> = {
  "/metrics": "metrics",
  "/chat": "chat",
  "/pipeline": "pipeline",
  "/bonus-pool": "bonusPool",
  "/content-inventory": "contentInventory",
  "/knowledge-base": "knowledgeBase",
  "/review-requests": "reviewRequests",
  "/api/assistant": "aiAssistant",
};

/** Human-readable feature names for upgrade prompts */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  crm: "CRM & Leads",
  projects: "Project Management",
  scheduling: "Scheduling",
  timeClock: "Time Clock",
  compliance: "Compliance",
  metrics: "Business Metrics",
  chat: "Team Chat",
  pipeline: "Sales Pipeline",
  bonusPool: "Bonus Pool",
  contentInventory: "Content Inventory",
  reviewRequests: "Review Requests",
  knowledgeBase: "Knowledge Base",
  aiAssistant: "AI Assistant",
};

/** Minimum plan required for each feature */
export const FEATURE_MIN_PLAN: Record<FeatureKey, string> = {
  crm: "free",
  projects: "free",
  scheduling: "free",
  timeClock: "free",
  compliance: "free",
  metrics: "starter",
  chat: "starter",
  pipeline: "starter",
  bonusPool: "pro",
  contentInventory: "pro",
  reviewRequests: "pro",
  knowledgeBase: "pro",
  aiAssistant: "pro",
};

/**
 * Check if a feature is enabled for the given features object
 */
export function hasFeature(
  features: Record<string, boolean> | null | undefined,
  feature: FeatureKey
): boolean {
  if (!features) return false;
  return features[feature] === true;
}

/**
 * Check if a route requires a feature and whether that feature is enabled
 * Returns the required feature key if blocked, null if allowed
 */
export function getBlockedFeature(
  pathname: string,
  features: Record<string, boolean> | null | undefined
): FeatureKey | null {
  for (const [route, feature] of Object.entries(FEATURE_ROUTE_MAP)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      if (!hasFeature(features, feature)) {
        return feature;
      }
    }
  }
  return null;
}
