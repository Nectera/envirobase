import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { sendNotificationToWorker, buildScheduleNotificationBody } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const existing = await prisma.scheduleEntry.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data: any = {};
    if (body.workerId !== undefined) data.workerId = body.workerId;
    if (body.projectId !== undefined) data.projectId = body.projectId;
    if (body.date !== undefined) data.date = body.date;
    if (body.shift !== undefined) data.shift = body.shift;
    if (body.hours !== undefined) data.hours = body.hours;
    if (body.notes !== undefined) data.notes = body.notes;

    const entry = await prisma.scheduleEntry.update({ where: { id: params.id }, data });

    // Notify worker of schedule change
    try {
      const workerId = entry.workerId || body.workerId;
      if (workerId) {
        const worker = await prisma.worker.findUnique({ where: { id: workerId } });
        const project = entry.projectId ? await prisma.project.findUnique({ where: { id: entry.projectId } }) : null;
        if (worker) {
          const notifBody = buildScheduleNotificationBody(
            worker.name,
            project?.name || "Unassigned",
            entry.date || "TBD",
            "changed",
          );
          sendNotificationToWorker(workerId, "scheduleChanged", `Schedule Updated: ${project?.name || "Assignment"} — ${entry.date || "TBD"}`, notifBody);
        }
      }
    } catch { /* notification failure should not block response */ }

    return NextResponse.json(entry);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const existing = await prisma.scheduleEntry.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.scheduleEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
