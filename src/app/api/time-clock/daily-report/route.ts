import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET – generate a daily time report for a project+date
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const date = url.searchParams.get("date");

    if (!projectId || !date) {
      return NextResponse.json({ error: "projectId and date are required" }, { status: 400 });
    }

    const entries = await prisma.timeEntry.findMany({
      where: { projectId, date },
      include: { worker: true },
    });

    // Separate by role
    const supervisorEntries = entries.filter((e: any) => e.role === "supervisor");
    const technicianEntries = entries.filter((e: any) => e.role === "technician");

    const sum = (arr: any[]) => arr.reduce((acc: number, e: any) => acc + (e.totalHours || 0), 0);

    const totalSupervisorHours = Math.round(sum(supervisorEntries) * 100) / 100;
    const totalTechnicianHours = Math.round(sum(technicianEntries) * 100) / 100;
    const totalHours = Math.round((totalSupervisorHours + totalTechnicianHours) * 100) / 100;

    const project = await prisma.project.findUnique({ where: { id: projectId } });

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
