/**
 * Organization context helpers for multi-tenancy.
 *
 * Provides utilities to:
 * 1. Extract organizationId from the current session
 * 2. Create org-scoped Prisma query helpers
 * 3. Validate org access
 */

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

// ─── Types ──────────────────────────────────────────────────────

export interface OrgSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string | null;
  };
}

// ─── Session Helpers ────────────────────────────────────────────

/**
 * Get the current authenticated session with organization context.
 * Returns null if not authenticated.
 */
export async function getOrgSession(): Promise<OrgSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session as unknown as OrgSession;
}

/**
 * Get organizationId from the current session.
 * Returns null if not authenticated or no org assigned.
 */
export async function getOrgId(): Promise<string | null> {
  const session = await getOrgSession();
  return session?.user?.organizationId ?? null;
}

/**
 * Require authentication with optional organization context.
 * Returns { session, orgId } or a NextResponse error.
 *
 * If the user has an organizationId, queries will be scoped to that org.
 * If the user has NO organizationId (e.g. standalone EnviroBase deployment),
 * orgId will be null and queries will return all data (no org filter).
 *
 * Use in API routes:
 *
 * ```ts
 * const auth = await requireOrg();
 * if (auth instanceof NextResponse) return auth;
 * const { session, orgId } = auth;
 * ```
 */
export async function requireOrg(): Promise<
  { session: OrgSession; orgId: string | null } | NextResponse
> {
  const session = await getOrgSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = session.user.organizationId;
  return { session, orgId };
}

// ─── Query Helpers ──────────────────────────────────────────────

/**
 * Inject organizationId into a Prisma WHERE clause.
 * If orgId is null, returns the original where clause unchanged
 * (backwards-compatible for pre-migration data).
 */
export function orgWhere(orgId: string | null, where?: any): any {
  if (!orgId) return where || {};
  return { ...where, organizationId: orgId };
}

/**
 * Inject organizationId into Prisma CREATE data.
 */
export function orgData(orgId: string | null, data: any): any {
  if (!orgId) return data;
  return { ...data, organizationId: orgId };
}
