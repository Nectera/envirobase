import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// PUT — Update a lead's pipeline stage override (for drag-and-drop)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { pipelineStage, projectStartDate, projectEndDate, includeSaturday, includeSunday } = body;

    if (!pipelineStage) {
      return NextResponse.json({ error: "pipelineStage is required" }, { status: 400 });
    }

    // Get the current lead with company info
    const currentLead = await prisma.lead.findFirst({
      where: orgWhere(orgId, { id: params.id }),
      include: { company: true },
    });

    if (!currentLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Moving to "scheduled" — save dates and scheduling fields
    if (pipelineStage === "scheduled") {
      const startDate = projectStartDate || (currentLead as any).projectStartDate;
      const endDate = projectEndDate || (currentLead as any).projectEndDate || null;

      // Update lead with pipelineStage and scheduling fields
      // Try with all fields first; if new columns don't exist yet, fall back to basic update
      let lead;
      try {
        const updateData: any = { pipelineStage };
        if (projectStartDate) updateData.projectStartDate = projectStartDate;
        if (projectEndDate) updateData.projectEndDate = projectEndDate;
        if (typeof includeSaturday === "boolean") updateData.includeSaturday = includeSaturday;
        if (typeof includeSunday === "boolean") updateData.includeSunday = includeSunday;
        lead = await prisma.lead.update({
          where: orgWhere(orgId, { id: params.id }),
          data: updateData,
        });
      } catch {
        // Fallback if new columns haven't been pushed yet
        const basicUpdate: any = { pipelineStage };
        if (projectStartDate) basicUpdate.projectStartDate = projectStartDate;
        lead = await prisma.lead.update({
          where: orgWhere(orgId, { id: params.id }),
          data: basicUpdate,
        });
      }

      // Update the linked project with start/end date
      if (currentLead.projectId) {
        const projectUpdate: any = {};
        if (startDate) projectUpdate.startDate = startDate;
        if (endDate) projectUpdate.estEndDate = endDate;
        await prisma.project.update({
          where: { id: currentLead.projectId },
          data: projectUpdate,
        });
      }

      // No separate CalendarEvent needed — the project already appears on the calendar
      // via its startDate/estEndDate range in the projectScheduleMap.

      // Log activity
      await prisma.activity.create({
        data: {
          parentType: "lead",
          parentId: params.id,
          type: "pipeline_scheduled",
          title: "Moved to Scheduled",
          description: `Project scheduled${startDate ? ` to start ${startDate}` : ""}${endDate ? ` through ${endDate}` : ""}.${includeSaturday ? " Includes Saturdays." : ""}${includeSunday ? " Includes Sundays." : ""}`,
          userId: "system",
        },
      });

      return NextResponse.json(lead);
    }

    // For other stages, just update the pipeline stage
    const lead = await prisma.lead.update({
      where: orgWhere(orgId, { id: params.id }),
      data: { pipelineStage },
    });

    return NextResponse.json(lead);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
