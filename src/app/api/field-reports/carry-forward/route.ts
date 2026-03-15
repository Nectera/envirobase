import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await prisma.project.findUnique({ where: { id: projectId } });

    // Resolve PM name from project
    let pmName = "";
    if (project?.projectManagerId) {
      const pm = await prisma.worker.findUnique({ where: { id: project.projectManagerId } });
      pmName = pm?.name || "";
    }

    const reports = await prisma.dailyFieldReport.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (!reports.length) {
      return NextResponse.json({
        hasHistory: false,
        projectId,
        projectName: project?.name || "",
        projectType: project?.type || "",
        data: {
          projectManagerName: pmName,
        },
      });
    }

    const raw = reports[0];
    // Flatten data JSON onto the report
    const latest: any = {
      ...raw,
      ...(raw.data && typeof raw.data === "object" ? raw.data : {}),
    };

    // Persistent fields that carry forward
    const carryForward = {
      supervisorName: latest.supervisorName || "",
      projectManagerName: latest.projectManagerName || pmName || "",
      scopeReceived: latest.scopeReceived ?? false,
      scopeDate: latest.scopeDate || "",
      scopeDescription: latest.scopeDescription || "",
      workAreaLocations: latest.workAreaLocations || [],
      goalsForWeek: latest.goalsForWeek || "",
      negativeAirMachineCount: latest.negativeAirMachineCount != null ? String(latest.negativeAirMachineCount) : "",
      asbestosInWorkArea: latest.asbestosInWorkArea || "",
      estimatedCompletionDate: latest.estimatedCompletionDate || "",
      estimatedHoursTotal: latest.estimatedHoursTotal != null ? String(latest.estimatedHoursTotal) : "",
      // Days remaining carries forward minus one day
      daysRemaining: latest.daysRemaining != null && Number(latest.daysRemaining) > 0
        ? String(Math.max(0, Number(latest.daysRemaining) - 1))
        : "",
      // Yesterday's goals become today's context
      previousGoalsForTomorrow: latest.goalsForTomorrow || "",
    };

    return NextResponse.json({
      hasHistory: true,
      projectId,
      projectName: project?.name || "",
      projectType: project?.type || "",
      previousDate: latest.date,
      previousReportId: latest.id,
      data: carryForward,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
