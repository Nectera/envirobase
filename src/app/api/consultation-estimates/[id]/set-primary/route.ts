import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

/**
 * POST /api/consultation-estimates/[id]/set-primary
 *
 * Marks this estimate as the primary for its linked project.
 * Unmarks any other estimates on the same project.
 * Also syncs this estimate's hours/days to the project.
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

    const estimate = await prisma.consultationEstimate.findFirst({
      where: orgWhere(orgId, { id: params.id }),
    });
    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const est = estimate as any;

    // Find linked project
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
        { error: "No project linked to this estimate." },
        { status: 400 }
      );
    }

    // Unmark all other estimates on this project
    await prisma.consultationEstimate.updateMany({
      where: { projectId, id: { not: params.id } },
      data: { isPrimary: false },
    });

    // Mark this one as primary and store projectId if missing
    await prisma.consultationEstimate.update({
      where: { id: params.id },
      data: { isPrimary: true, projectId },
    });

    // Sync hours to the project
    const estDays = est.daysNeeded ? Math.ceil(est.daysNeeded) : null;
    const estLaborHours = Math.ceil(
      (est.supervisorHours || 0) + (est.supervisorOtHours || 0) +
      (est.technicianHours || 0) + (est.technicianOtHours || 0)
    ) || null;

    await prisma.project.update({
      where: { id: projectId },
      data: {
        estimatedDays: estDays,
        estimatedLaborHours: estLaborHours,
        maxHoursPerDay: est.hoursPerDay || 8,
      },
    });

    return NextResponse.json({
      success: true,
      projectId,
      synced: { estimatedDays: estDays, estimatedLaborHours: estLaborHours },
    });
  } catch (error: any) {
    console.error("Set primary error:", error?.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
