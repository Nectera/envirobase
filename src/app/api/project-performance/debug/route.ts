import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/project-performance/debug
 * Temporary diagnostic endpoint — dumps post-cost estimates, project data,
 * and linked estimates for debugging performance page issues.
 * Safe to delete once everything is stable.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const user = session.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // All post-cost estimates
    const postCostEstimates = await prisma.consultationEstimate.findMany({
      where: {
        organizationId: orgId,
        isPostCost: true,
      },
      select: {
        id: true,
        customerName: true,
        projectId: true,
        projectNumber: true,
        originalEstimateId: true,
        status: true,
        customerPrice: true,
        isPostCost: true,
        isPrimary: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // All projects with status in_progress or completed
    const projects = await prisma.project.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["in_progress", "completed"] },
      },
      select: {
        id: true,
        name: true,
        projectNumber: true,
        status: true,
        office: true,
        startDate: true,
        estEndDate: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // All consultation estimates linked to those projects
    const projectIds = projects.map((p: any) => p.id);
    const projectNumbers = projects.map((p: any) => p.projectNumber).filter(Boolean) as string[];

    const linkedEstimates = await prisma.consultationEstimate.findMany({
      where: {
        OR: [
          { projectId: { in: projectIds } },
          ...(projectNumbers.length > 0 ? [{ projectNumber: { in: projectNumbers } }] : []),
        ],
      },
      select: {
        id: true,
        customerName: true,
        projectId: true,
        projectNumber: true,
        originalEstimateId: true,
        status: true,
        customerPrice: true,
        isPostCost: true,
        isPrimary: true,
        leadId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      postCostEstimates,
      projects,
      linkedEstimates,
      counts: {
        postCostEstimates: postCostEstimates.length,
        projects: projects.length,
        linkedEstimates: linkedEstimates.length,
      },
    });
  } catch (error: any) {
    console.error("Project performance debug error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
