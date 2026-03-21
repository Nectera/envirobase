import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { getCertRequirementsConfig, CERT_REQUIREMENTS_DEFAULTS } from "@/lib/cert-requirements";

export const dynamic = "force-dynamic";

/**
 * GET /api/cert-requirements
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;

    const config = await getCertRequirementsConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Cert requirements GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/cert-requirements
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const user = session.user as any;
    if (user?.role !== "ADMIN" && user?.role !== "PROJECT_MANAGER" && user?.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e: any) {
      return NextResponse.json({ error: "Invalid JSON: " + e.message }, { status: 400 });
    }

    const updated = {
      enforceOnScheduling: body.enforceOnScheduling !== undefined ? body.enforceOnScheduling : true,
      expiringThresholdDays: body.expiringThresholdDays || 30,
      alertDays: Array.isArray(body.alertDays) ? body.alertDays : [30, 14, 7],
      requirements: body.requirements || {},
    };

    const jsonStr = JSON.stringify(updated);

    try {
      await prisma.setting.upsert({
        where: { key: "certRequirementsConfig" },
        data: { value: jsonStr },
      });
    } catch (dbError: any) {
      console.error("Cert requirements DB error:", dbError?.message);
      return NextResponse.json({
        error: "Database save failed: " + (dbError.message || "Unknown error"),
      }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Cert requirements PUT error:", error?.message);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
