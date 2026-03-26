import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

/**
 * POST /api/consultation-estimates/[id]/sync-to-project
 *
 * Syncs the estimated days and labor hours from a consultation estimate
 * to its linked project. This allows updating a project's estimates
 * after the initial creation (e.g., when an estimate is revised).
 *
 * Finds the project via: estimate.projectId → project
 * Or fallback via: estimate.leadId → lead.projectId → project
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Fetch the consultation estimate
    const estimate = await prisma.consultationEstimate.findFirst({
      where: orgWhere(orgId, { id: params.id }),
    });
    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const est = estimate as any;

    // Find the linked project — either directly on estimate or via the lead
    let projectId: string | null = est.projectId || null;

    if (!projectId && est.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: est.leadId },
        select: { projectId: true },
      });
      projectId = lead?.projectId || null;
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "No project linked to this estimate. The estimate must be approved first to create a project." },
        { status: 400 }
      );
    }

    // Verify the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, estimatedDays: true, estimatedLaborHours: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Linked project not found" }, { status: 404 });
    }

    // Calculate estimated values from the consultation estimate
    const estDays = est.daysNeeded ? Math.ceil(est.daysNeeded) : null;
    const estLaborHours = Math.ceil(
      (est.supervisorHours || 0) +
      (est.supervisorOtHours || 0) +
      (est.technicianHours || 0) +
      (est.technicianOtHours || 0)
    ) || null;

    // Update the project with the new estimates
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        estimatedDays: estDays,
        estimatedLaborHours: estLaborHours,
        maxHoursPerDay: est.hoursPerDay || 8,
      },
    });

    // Also store the projectId on the estimate if not already set
    if (!est.projectId) {
      await prisma.consultationEstimate.update({
        where: { id: params.id },
        data: { projectId, projectNumber: (updatedProject as any).projectNumber || null },
      });
    }

    return NextResponse.json({
      success: true,
      projectId,
      projectName: (project as any).name,
      synced: {
        estimatedDays: estDays,
        estimatedLaborHours: estLaborHours,
      },
      previous: {
        estimatedDays: project.estimatedDays,
        estimatedLaborHours: project.estimatedLaborHours,
      },
    });
  } catch (error: any) {
    console.error("Sync to project error:", error?.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
