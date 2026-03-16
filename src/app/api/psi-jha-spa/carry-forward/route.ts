import { NextResponse, NextRequest } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Returns persistent project-level fields from most recent PSI/JHA/SPA
export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const items = await prisma.psiJhaSpa.findMany({ where: orgWhere(orgId, { projectId }) });
    if (items.length === 0) {
      // Also pull project address info
      const project = await prisma.project.findUnique({ where: orgWhere(orgId, { id: projectId }) });
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
