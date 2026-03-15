import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReviewConfig, DRIP_SEQUENCE } from "@/lib/review-config";

/**
 * GET /api/review-requests/config
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const config = await getReviewConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Review config GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/review-requests/config
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }

    // Build the updated config from the body, falling back to defaults
    const updated: Record<string, any> = {
      locations: Array.isArray(body.locations) ? body.locations : [
        { key: "front_range", name: "Front Range", reviewUrl: "" },
        { key: "western_slope", name: "Western Slope", reviewUrl: "" },
      ],
      autoSendEnabled: body.autoSendEnabled !== undefined ? body.autoSendEnabled : true,
      emailSubject: body.emailSubject || "How was your experience with Xtract Environmental?",
      smsBody: body.smsBody || "",
      defaultMethod: body.defaultMethod || "both",
      sequence: Array.isArray(body.sequence) ? body.sequence : DRIP_SEQUENCE,
    };

    let jsonStr: string;
    try {
      jsonStr = JSON.stringify(updated);
    } catch (e: any) {
      return NextResponse.json({ error: "Failed to serialize config: " + e.message }, { status: 500 });
    }

    try {
      // Note: prisma.setting.upsert uses a custom wrapper that expects { where, data }
      // NOT the standard Prisma { where, create, update } format
      await prisma.setting.upsert({
        where: { key: "reviewConfig" },
        data: { value: jsonStr },
      });
    } catch (dbError: any) {
      console.error("Review config DB error:", dbError?.message, dbError?.code, dbError?.meta);
      return NextResponse.json({
        error: "Database save failed: " + (dbError.message || "Unknown DB error"),
      }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Review config PUT error:", error?.message, error?.stack);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
