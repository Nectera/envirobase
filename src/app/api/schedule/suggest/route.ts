import { NextRequest, NextResponse } from "next/server";
import { calculateWorkerScores } from "@/lib/schedule-scoring";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { projectId, startDate, endDate, crewSize } = await req.json();

    if (!projectId || !startDate) {
      return NextResponse.json(
        { error: "projectId and startDate are required" },
        { status: 400 }
      );
    }

    const result = await calculateWorkerScores(
      projectId,
      startDate,
      endDate || undefined,
      crewSize || undefined
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
