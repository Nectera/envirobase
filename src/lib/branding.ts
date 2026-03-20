/**
 * Central branding configuration for white-label deployments.
 * All tenant-specific branding pulls from environment variables.
 *
 * To deploy for a new tenant, set these env vars in Vercel:
 *   NEXT_PUBLIC_APP_NAME          - e.g. "EnviroBase"
 *   NEXT_PUBLIC_COMPANY_NAME      - e.g. "EnviroBase Environmental Services"
 *   NEXT_PUBLIC_COMPANY_SHORT     - e.g. "EnviroBase"
 *   NEXT_PUBLIC_BRAND_COLOR       - e.g. "#7BC143"
 *   NEXT_PUBLIC_SUPPORT_EMAIL     - e.g. "support@envirobase.io"
 *   NEXT_PUBLIC_COMPANY_LOCATION  - e.g. "Denver, CO"
 *   NEXT_PUBLIC_APP_DOMAIN        - e.g. "envirobase.io"
 */

// ── Client-safe branding (NEXT_PUBLIC_ prefix) ──

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "EnviroBase";
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "EnviroBase Environmental Services";
export const COMPANY_SHORT = process.env.NEXT_PUBLIC_COMPANY_SHORT || "EnviroBase";
export const BRAND_COLOR = process.env.NEXT_PUBLIC_BRAND_COLOR || "#7BC143";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@envirobase.app";
export const COMPANY_LOCATION = process.env.NEXT_PUBLIC_COMPANY_LOCATION || "Colorado";
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "envirobase.app";
export const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || "/logo.png";
export const APP_URL = process.env.NEXTAUTH_URL || `https://${APP_DOMAIN}`;

// AI assistant branding
export const AI_NAME = `${APP_NAME} AI`;

// ── Email template helpers (server-only usage is fine) ──

export function emailHeader(): string {
  const color = BRAND_COLOR.replace("#", "");
  return `<h1 style="color:#${color};margin:0 0 16px 0;font-size:22px;">${COMPANY_SHORT}</h1>`;
}

export function emailFooter(): string {
  const color = BRAND_COLOR.replace("#", "");
  return `<p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">${COMPANY_NAME} &bull; ${COMPANY_LOCATION}</p>`;
}

export function emailButtonStyle(): string {
  const color = BRAND_COLOR.replace("#", "");
  return `display:inline-block;padding:12px 28px;background:#${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;`;
}
