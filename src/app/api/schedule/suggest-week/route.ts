import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { calculateWeekSchedule } from "@/lib/schedule-week";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { weekStartDate, projectOverrides } = await req.json();

    if (!weekStartDate) {
      return NextResponse.json(
        { error: "weekStartDate is required (should be a Monday)" },
        { status: 400 }
      );
    }

    const result = await calculateWeekSchedule(weekStartDate, projectOverrides);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("Week schedule error:", { error: String(error) });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
