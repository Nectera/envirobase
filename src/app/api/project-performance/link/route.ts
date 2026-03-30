import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org-context";
import { isAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * GET /api/project-performance/link
 * Returns unlinked consultation estimates (no projectId and projectNumber
 * doesn't match any project) so the admin can manually link them.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    if (!isAdmin((session.user as any)?.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all project numbers so we can exclude estimates that match
    const projects = await prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, projectNumber: true, status: true },
      orderBy: { name: "asc" },
    });
    const projectNumberSet = new Set(
      projects.map((p: any) => p.projectNumber).filter(Boolean)
    );

    // Get estimates without a projectId
    const unlinkedEstimates = await prisma.consultationEstimate.findMany({
      where: {
        organizationId: orgId,
        projectId: null,
        isPostCost: { not: true },
      },
      select: {
        id: true,
        customerName: true,
        address: true,
        customerPrice: true,
        projectNumber: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter out estimates whose projectNumber already matches a project
    const orphaned = (unlinkedEstimates as any[]).filter(
      (est) => !est.projectNumber || !projectNumberSet.has(est.projectNumber)
    );

    // Also get projects that have no linked estimate (for the dropdown)
    const projectIds = await prisma.consultationEstimate.findMany({
      where: { organizationId: orgId, projectId: { not: null } },
      select: { projectId: true },
    });
    const linkedProjectIds = new Set(
      (projectIds as any[]).map((e) => e.projectId).filter(Boolean)
    );

    // Include all projects in the dropdown (they might want to link a second estimate)
    const projectOptions = projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      projectNumber: p.projectNumber,
      status: p.status,
      hasEstimate: linkedProjectIds.has(p.id),
    }));

    return NextResponse.json({
      unlinkedEstimates: orphaned,
      projects: projectOptions,
    });
  } catch (error: any) {
    console.error("Link estimates GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/project-performance/link
 * Links a consultation estimate to a project.
 * Body: { estimateId: string, projectId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    if (!isAdmin((session.user as any)?.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { estimateId, projectId } = body;

    if (!estimateId || !projectId) {
      return NextResponse.json({ error: "estimateId and projectId are required" }, { status: 400 });
    }

    // Verify both exist and belong to this org
    const estimate = await prisma.consultationEstimate.findFirst({
      where: { id: estimateId, organizationId: orgId },
    });
    if (!estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true, projectNumber: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Update the estimate to link it
    await prisma.consultationEstimate.update({
      where: { id: estimateId },
      data: {
        projectId: projectId,
        projectNumber: project.projectNumber || undefined,
      },
    });

    // Also link any post-cost that references this estimate
    await prisma.consultationEstimate.updateMany({
      where: { originalEstimateId: estimateId, organizationId: orgId },
      data: {
        projectId: projectId,
        projectNumber: project.projectNumber || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Link estimates POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
