import { prisma } from "@/lib/prisma";

/**
 * Cert Requirements Config
 *
 * Maps project types to the certification names required for workers
 * to be scheduled on those projects. Used for hard-blocking uncertified
 * workers from being assigned.
 *
 * Example:
 * {
 *   "ASBESTOS": ["Asbestos Inspector", "Asbestos Supervisor"],
 *   "LEAD": ["Lead Inspector", "Lead Risk Assessor"],
 *   "MOLD": ["Mold Assessor"],
 * }
 */

export interface CertRequirementsConfig {
  /** Whether to enforce cert requirements (hard block vs disabled) */
  enforceOnScheduling: boolean;
  /** Days before expiry to consider a cert as "expiring soon" */
  expiringThresholdDays: number;
  /** Days before expiry at which alerts are generated */
  alertDays: number[];
  /** Map of project type → array of required certification names */
  requirements: Record<string, string[]>;
}

export const CERT_REQUIREMENTS_DEFAULTS: CertRequirementsConfig = {
  enforceOnScheduling: true,
  expiringThresholdDays: 30,
  alertDays: [30, 14, 7],
  requirements: {},
};

export async function getCertRequirementsConfig(): Promise<CertRequirementsConfig> {
  const setting = await prisma.setting.findUnique({
    where: { key: "certRequirementsConfig" },
  });
  if (!setting) return CERT_REQUIREMENTS_DEFAULTS;
  try {
    const parsed = JSON.parse(setting.value);
    return {
      ...CERT_REQUIREMENTS_DEFAULTS,
      ...parsed,
    };
  } catch {
    return CERT_REQUIREMENTS_DEFAULTS;
  }
}

/**
 * Check if a worker has valid (non-expired) certifications
 * for a given project type.
 *
 * Returns { allowed, missing, expired } where:
 *   - allowed: true if worker can be scheduled
 *   - missing: cert names the worker doesn't have at all
 *   - expired: cert names the worker has but are expired
 */
export async function checkWorkerCertsForProject(
  workerId: string,
  projectTypes: string[]
): Promise<{
  allowed: boolean;
  missing: string[];
  expired: string[];
}> {
  const config = await getCertRequirementsConfig();

  if (!config.enforceOnScheduling) {
    return { allowed: true, missing: [], expired: [] };
  }

  // Gather all required cert names across project types
  const requiredCerts = new Set<string>();
  for (const pt of projectTypes) {
    const reqs = config.requirements[pt.toUpperCase()] || [];
    reqs.forEach((r: string) => requiredCerts.add(r));
  }

  if (requiredCerts.size === 0) {
    return { allowed: true, missing: [], expired: [] };
  }

  // Fetch worker's certifications
  const workerCerts = await prisma.certification.findMany({
    where: { workerId },
  });

  const missing: string[] = [];
  const expired: string[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const reqCert of Array.from(requiredCerts)) {
    const matchingCert = workerCerts.find(
      (c: any) => c.name.toLowerCase() === reqCert.toLowerCase()
    );

    if (!matchingCert) {
      missing.push(reqCert);
    } else if (matchingCert.expires && matchingCert.expires < today) {
      expired.push(reqCert);
    }
  }

  return {
    allowed: missing.length === 0 && expired.length === 0,
    missing,
    expired,
  };
}
