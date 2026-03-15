import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { checkWorkerCertsForProject } from "@/lib/cert-requirements";

/**
 * POST /api/cert-requirements/check
 *
 * Check if a worker has valid certs for a project type.
 * Used by ScheduleModal to enforce hard blocks.
 *
 * Body: { workerId: string, projectTypes: string[] }
 * Returns: { allowed: boolean, missing: string[], expired: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { workerId, projectTypes } = body;

    if (!workerId || !Array.isArray(projectTypes)) {
      return NextResponse.json(
        { error: "workerId and projectTypes[] required" },
        { status: 400 }
      );
    }

    const result = await checkWorkerCertsForProject(workerId, projectTypes);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Cert check error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
