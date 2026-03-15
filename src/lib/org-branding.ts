/**
 * Organization-aware branding.
 *
 * Loads branding from the Organization table at runtime, falling back
 * to environment variables (backwards-compatible with single-tenant deploys).
 *
 * Usage in API routes / server components:
 *   const branding = await getOrgBranding(orgId);
 *   branding.appName; // "EnviroBase"
 *
 * Usage in client components:
 *   Use the OrgBrandingProvider (see below) or pass branding as props from layout.
 */

import { PrismaClient } from "@prisma/client";

// Import env-based defaults
import {
  APP_NAME,
  COMPANY_NAME,
  COMPANY_SHORT,
  BRAND_COLOR,
  SUPPORT_EMAIL,
  COMPANY_LOCATION,
  APP_DOMAIN,
  LOGO_URL,
} from "./branding";

const globalForPrisma = global as unknown as { __prisma: PrismaClient };
const rawPrisma = globalForPrisma.__prisma || new PrismaClient();

export interface OrgBranding {
  organizationId: string | null;
  appName: string;
  companyName: string;
  companyShort: string;
  brandColor: string;
  accentColor: string | null;
  supportEmail: string;
  companyLocation: string;
  domain: string;
  logoUrl: string;
  website: string | null;
  plan: string;
  features: Record<string, boolean>;
  maxUsers: number;
  maxWorkers: number;
}

// In-memory cache (5-minute TTL)
const cache = new Map<string, { data: OrgBranding; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load branding for an organization. Falls back to env vars if orgId is null
 * or org is not found.
 */
export async function getOrgBranding(orgId: string | null): Promise<OrgBranding> {
  // No org → use env var defaults
  if (!orgId) return getDefaultBranding();

  // Check cache
  const cached = cache.get(orgId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const org = await rawPrisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) return getDefaultBranding();

    const branding: OrgBranding = {
      organizationId: org.id,
      appName: org.appName || APP_NAME,
      companyName: org.companyName || COMPANY_NAME,
      companyShort: org.companyShort || COMPANY_SHORT,
      brandColor: org.brandColor || BRAND_COLOR,
      accentColor: org.accentColor,
      supportEmail: org.supportEmail || SUPPORT_EMAIL,
      companyLocation: org.companyLocation || COMPANY_LOCATION,
      domain: org.domain || APP_DOMAIN,
      logoUrl: org.logoUrl || LOGO_URL,
      website: org.website,
      plan: org.plan,
      features: (org.features as Record<string, boolean>) || {},
      maxUsers: org.maxUsers,
      maxWorkers: org.maxWorkers,
    };

    // Cache it
    cache.set(orgId, { data: branding, expires: Date.now() + CACHE_TTL });

    return branding;
  } catch {
    return getDefaultBranding();
  }
}

/**
 * Get branding by org slug (for domain-based routing).
 */
export async function getOrgBrandingBySlug(slug: string): Promise<OrgBranding> {
  try {
    const org = await rawPrisma.organization.findUnique({
      where: { slug },
    });
    if (!org) return getDefaultBranding();
    return getOrgBranding(org.id);
  } catch {
    return getDefaultBranding();
  }
}

/**
 * Get branding by custom domain.
 */
export async function getOrgBrandingByDomain(domain: string): Promise<OrgBranding> {
  try {
    const org = await rawPrisma.organization.findFirst({
      where: { domain },
    });
    if (!org) return getDefaultBranding();
    return getOrgBranding(org.id);
  } catch {
    return getDefaultBranding();
  }
}

/** Invalidate cache for an org (call after branding updates). */
export function invalidateOrgBrandingCache(orgId: string) {
  cache.delete(orgId);
}

function getDefaultBranding(): OrgBranding {
  return {
    organizationId: null,
    appName: APP_NAME,
    companyName: COMPANY_NAME,
    companyShort: COMPANY_SHORT,
    brandColor: BRAND_COLOR,
    accentColor: null,
    supportEmail: SUPPORT_EMAIL,
    companyLocation: COMPANY_LOCATION,
    domain: APP_DOMAIN,
    logoUrl: LOGO_URL,
    website: null,
    plan: "enterprise",
    features: {},
    maxUsers: 100,
    maxWorkers: 200,
  };
}
