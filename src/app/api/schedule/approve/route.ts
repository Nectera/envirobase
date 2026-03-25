import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { isAdmin } from "@/lib/roles";
import { sendNotificationToWorker, buildScheduleNotificationBody } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/schedule/approve
 * Approve or reject a draft schedule week.
 *
 * Body: { weekStart: string, action: "approve" | "reject", rejectedNote?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    // Only ADMIN (General Manager) can approve schedules
    if (!isAdmin(userRole)) {
      return NextResponse.json(
        { error: "Only the General Manager can approve schedules." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { weekStart, action, rejectedNote } = body;

    if (!weekStart || !action) {
      return NextResponse.json(
        { error: "weekStart and action are required" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Find the ScheduleWeek record
    const scheduleWeek = await prisma.scheduleWeek.findUnique({
      where: { weekStart },
    });

    if (!scheduleWeek) {
      return NextResponse.json(
        { error: "No schedule found for this week." },
        { status: 404 }
      );
    }

    // Calculate week end (Friday)
    const mondayDate = new Date(weekStart + "T12:00:00");
    const fridayDate = new Date(mondayDate);
    fridayDate.setDate(fridayDate.getDate() + 4);
    const weekEnd = fridayDate.toISOString().split("T")[0];

    if (action === "approve") {
      // Update ScheduleWeek to approved
      await prisma.scheduleWeek.update({
        where: { weekStart },
        data: {
          status: "approved",
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });

      // Update all draft entries for this week to approved
      const draftEntries = await prisma.scheduleEntry.findMany({
        where: {
          date: { gte: weekStart, lte: weekEnd },
          status: "draft",
        },
        include: { worker: true, project: true },
      });

      for (const entry of draftEntries) {
        await prisma.scheduleEntry.update({
          where: { id: entry.id },
          data: { status: "approved" },
        });
      }

      // Now send notifications to all workers who got assigned
      // Group by worker to send one notification per worker
      const workerNotifications: Record<string, { projectName: string; date: string }> = {};
      for (const entry of draftEntries) {
        const wid = (entry as any).workerId;
        if (!workerNotifications[wid]) {
          workerNotifications[wid] = {
            projectName: (entry as any).project?.name || "Unassigned",
            date: (entry as any).date,
          };
        }
      }

      for (const [workerId, info] of Object.entries(workerNotifications)) {
        try {
          const worker = await prisma.worker.findUnique({ where: { id: workerId } });
          if (worker) {
            const emailBody = buildScheduleNotificationBody(
              worker.name,
              info.projectName,
              `Week of ${weekStart}`,
              "assigned",
            );
            await sendNotificationToWorker(
              workerId,
              "scheduleAssigned",
              `Schedule Approved: ${info.projectName} — Week of ${weekStart}`,
              emailBody
            );
          }
        } catch (err: any) {
          logger.warn("Failed to notify worker after approval", { workerId, error: err.message });
        }
      }

      logger.info("Schedule week approved", { weekStart, approvedBy: userId, entriesApproved: draftEntries.length });

      return NextResponse.json({
        status: "approved",
        entriesApproved: draftEntries.length,
        workersNotified: Object.keys(workerNotifications).length,
      });
    }

    if (action === "reject") {
      // Update ScheduleWeek to rejected
      await prisma.scheduleWeek.update({
        where: { weekStart },
        data: {
          status: "rejected",
          rejectedNote: rejectedNote || null,
        },
      });

      // Delete all draft entries for this week (they weren't finalized)
      const deleted = await prisma.scheduleEntry.deleteMany({
        where: {
          date: { gte: weekStart, lte: weekEnd },
          status: "draft",
        },
      });

      logger.info("Schedule week rejected", { weekStart, rejectedBy: userId, entriesRemoved: deleted.count });

      return NextResponse.json({
        status: "rejected",
        entriesRemoved: deleted.count,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    logger.error("Schedule approve error", { error: error.message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/schedule/approve?weekStart=YYYY-MM-DD
 * Get the status of a schedule week (for the approval banner).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;

    const weekStart = req.nextUrl.searchParams.get("weekStart");
    if (!weekStart) {
      // Return all pending/draft schedule weeks
      const weeks = await prisma.scheduleWeek.findMany({
        where: { status: { in: ["draft", "pending_approval"] } },
        orderBy: { weekStart: "desc" },
        take: 10,
      });
      return NextResponse.json(weeks);
    }

    const scheduleWeek = await prisma.scheduleWeek.findUnique({
      where: { weekStart },
    });

    if (!scheduleWeek) {
      return NextResponse.json({ status: "none" });
    }

    return NextResponse.json(scheduleWeek);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
