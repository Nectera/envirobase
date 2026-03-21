import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await prisma.project.findUnique({ where: orgWhere(orgId, { id: projectId }) });

    // Resolve PM name from project
    let pmName = "";
    if (project?.projectManagerId) {
      const pm = await prisma.worker.findUnique({ where: { id: project.projectManagerId } });
      pmName = pm?.name || "";
    }

    const reports = await prisma.dailyFieldReport.findMany({
      where: orgWhere(orgId, { projectId }),
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
      negativeAirEstablished: latest.negativeAirEstablished ?? false,
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
