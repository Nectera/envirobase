import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { sendNotificationToWorker, buildScheduleNotificationBody } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const workerId = req.nextUrl.searchParams.get("workerId");
    const projectId = req.nextUrl.searchParams.get("projectId");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    const where: any = orgWhere(orgId);
    if (workerId) where.workerId = workerId;
    if (projectId) where.projectId = projectId;
    if (startDate && endDate) where.dateRange = { start: startDate, end: endDate };

    const entries = await prisma.scheduleEntry.findMany({
      where,
      include: { worker: true, project: true },
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    // Resolve worker and project names for notification
    const notifyWorker = async (workerId: string, projectId: string | null, date: string) => {
      try {
        const worker = await prisma.worker.findUnique({ where: { id: workerId } });
        const project = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null;
        if (worker) {
          const body = buildScheduleNotificationBody(
            worker.name,
            project?.name || "Unassigned",
            date,
            "assigned",
          );
          await sendNotificationToWorker(workerId, "scheduleAssigned", `Schedule: ${project?.name || "New Assignment"} — ${date}`, body);
        }
      } catch { /* notification failure should not block response */ }
    };

    // Bulk create: if `dates` array is provided, create one entry per date (skip duplicates)
    if (Array.isArray(body.dates) && body.dates.length > 0) {
      // Find existing entries to avoid duplicates
      const existing = await prisma.scheduleEntry.findMany({
        where: {
          ...orgWhere(orgId),
          workerId: body.workerId,
          projectId: body.projectId,
          date: { in: body.dates },
          shift: body.shift || "full",
        },
        select: { date: true },
      });
      const existingDates = new Set(existing.map((e: any) => e.date));

      const created = [];
      for (const date of body.dates) {
        if (existingDates.has(date)) continue; // Skip duplicates
        const entry = await prisma.scheduleEntry.create({
          data: orgData(orgId, {
            workerId: body.workerId,
            projectId: body.projectId,
            date,
            shift: body.shift || "full",
            hours: body.hours || 8,
            notes: body.notes || null,
          }),
        });
        created.push(entry);
      }
      // Notify worker once for the batch (use first date)
      if (created.length > 0) {
        notifyWorker(body.workerId, body.projectId, body.dates[0]);
      }
      return NextResponse.json(created, { status: 201 });
    }

    // Single create — check for existing entry to avoid duplicates
    const existingSingle = await prisma.scheduleEntry.findFirst({
      where: {
        ...orgWhere(orgId),
        workerId: body.workerId,
        projectId: body.projectId,
        date: body.date,
        shift: body.shift || "full",
      },
    });
    if (existingSingle) {
      return NextResponse.json(existingSingle, { status: 200 });
    }

    const entry = await prisma.scheduleEntry.create({
      data: orgData(orgId, {
        workerId: body.workerId,
        projectId: body.projectId,
        date: body.date,
        shift: body.shift || "full",
        hours: body.hours || 8,
        notes: body.notes || null,
      }),
    });

    // Notify assigned worker
    notifyWorker(body.workerId, body.projectId, body.date);

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
