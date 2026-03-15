import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns persistent project-level fields from most recent PSI/JHA/SPA
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const items = await prisma.psiJhaSpa.findMany({ where: { projectId } });
    if (items.length === 0) {
      // Also pull project address info
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      return NextResponse.json({
        hasHistory: false,
        jobSiteAddress: project?.address || "",
        permitNumber: project?.permitNumber || "",
      });
    }

    const latest = items[0]; // already sorted newest-first
    return NextResponse.json({
      hasHistory: true,
      jobNumber: latest.jobNumber,
      permitNumber: latest.permitNumber,
      taskLocation: latest.taskLocation,
      musterPoint: latest.musterPoint,
      jobSiteAddress: latest.jobSiteAddress,
      nearestHospital: latest.nearestHospital,
      nearestHospitalAddress: latest.nearestHospitalAddress,
      evacuationPlan: latest.evacuationPlan,
      // Carry forward the hazard checklists and PPE as defaults
      environmentHazards: latest.environmentHazards,
      ergonomicsHazards: latest.ergonomicsHazards,
      heightHazards: latest.heightHazards,
      activityHazards: latest.activityHazards,
      accessEgressHazards: latest.accessEgressHazards,
      personalLimitationsHazards: latest.personalLimitationsHazards,
      ppeRequirements: latest.ppeRequirements,
      // Carry forward task steps as a starting template
      taskSteps: latest.taskSteps,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
