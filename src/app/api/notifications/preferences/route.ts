import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

/**
 * GET /api/notifications/preferences
 * Fetch the current user's notification preferences.
 * Creates default preferences on first access (all enabled except taskCompleted).
 */
export async function GET() {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    // Upsert: create default preferences if they don't exist yet
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    return NextResponse.json(prefs);
  } catch (error: any) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/preferences
 * Update the current user's notification preferences.
 * Body: partial object with boolean fields to update.
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    // Only allow known boolean preference fields
    const allowedFields = [
      "scheduleAssigned",
      "scheduleChanged",
      "taskAssigned",
      "taskDueSoon",
      "taskCompleted",
      "certExpiring",
      "incidentReported",
      "fieldReportSubmitted",
      "inventoryReviewCompleted",
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (typeof body[field] === "boolean") {
        updateData[field] = body[field];
      }
    }

    // Upsert to handle first-time update gracefully
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });

    return NextResponse.json(prefs);
  } catch (error: any) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
