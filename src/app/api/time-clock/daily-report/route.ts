import { NextResponse, NextRequest } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET – generate a daily time report for a project+date
export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const date = url.searchParams.get("date");

    if (!projectId || !date) {
      return NextResponse.json({ error: "projectId and date are required" }, { status: 400 });
    }

    const entries = await prisma.timeEntry.findMany({
      where: orgWhere(orgId, { projectId, date }),
      include: { worker: true },
    });

    // Separate by role
    const supervisorEntries = entries.filter((e: any) => e.role === "supervisor");
    const technicianEntries = entries.filter((e: any) => e.role === "technician");

    const sum = (arr: any[]) => arr.reduce((acc: number, e: any) => acc + (e.totalHours || 0), 0);

    const totalSupervisorHours = Math.round(sum(supervisorEntries) * 100) / 100;
    const totalTechnicianHours = Math.round(sum(technicianEntries) * 100) / 100;
    const totalHours = Math.round((totalSupervisorHours + totalTechnicianHours) * 100) / 100;

    const project = await prisma.project.findUnique({ where: orgWhere(orgId, { id: projectId }) });

    const report = {
      projectId,
      project,
      date,
      entries,
      supervisorEntries,
      technicianEntries,
      totalSupervisorHours,
      totalTechnicianHours,
      totalHours,
      headcount: entries.length,
      openEntries: entries.filter((e: any) => !e.clockOut).length,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
