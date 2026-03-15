import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import {
  getEstimateFollowUpConfig,
  ESTIMATE_FOLLOWUP_SEQUENCE,
} from "@/lib/estimate-followup-config";

/**
 * GET /api/estimate-follow-ups/config
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;

    const config = await getEstimateFollowUpConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Estimate follow-up config GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/estimate-follow-ups/config
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const user = session.user as any;
    if (user?.role !== "ADMIN" && user?.role !== "SUPERVISOR" && user?.role !== "OFFICE") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e: any) {
      return NextResponse.json({ error: "Invalid JSON body: " + e.message }, { status: 400 });
    }

    const updated = {
      enabled: body.enabled !== undefined ? body.enabled : true,
      sequence: Array.isArray(body.sequence) ? body.sequence : ESTIMATE_FOLLOWUP_SEQUENCE,
    };

    const jsonStr = JSON.stringify(updated);

    try {
      // Note: prisma.setting.upsert uses a custom wrapper that expects { where, data }
      await prisma.setting.upsert({
        where: { key: "estimateFollowUpConfig" },
        data: { value: jsonStr },
      });
    } catch (dbError: any) {
      console.error("Estimate follow-up config DB error:", dbError?.message);
      return NextResponse.json({
        error: "Database save failed: " + (dbError.message || "Unknown DB error"),
      }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Estimate follow-up config PUT error:", error?.message);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
