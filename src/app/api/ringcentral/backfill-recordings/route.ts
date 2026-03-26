import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rcApiCall } from "@/lib/ringcentral";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/ringcentral/backfill-recordings
 *
 * Scans recent call activities that are missing recordings or duration,
 * looks them up in the RingCentral call-log API, and backfills the data.
 *
 * This should be called periodically (e.g., every few minutes via cron)
 * or triggered after the activity feed loads.
 */
export async function POST(_req: NextRequest) {
  try {
    // Find recent call activities (last 24h) that have a sessionId but no recording
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const callActivities = await prisma.activity.findMany({
      where: {
        type: "call",
        user: "RingCentral",
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Filter to ones missing recording or with 0 duration
    const needsUpdate = callActivities.filter((a: any) => {
      const meta = a.metadata as any;
      if (!meta?.sessionId && !meta?.telephonySessionId && !meta?.fromNumber) return false;
      return !meta.recordingUrl || meta.duration === 0;
    });

    if (needsUpdate.length === 0) {
      return NextResponse.json({ updated: 0, message: "No activities need backfill" });
    }

    // Fetch recent call log with recordings from RingCentral
    let callLogRecords: any[] = [];
    try {
      const dateFrom = cutoff.toISOString();
      const callLog = await rcApiCall(
        "GET",
        `/account/~/extension/~/call-log?dateFrom=${dateFrom}&withRecording=true&view=Detailed&perPage=100`
      );
      callLogRecords = callLog?.records || [];
    } catch (err: any) {
      logger.error("Failed to fetch RC call log for backfill", { error: err.message });
      return NextResponse.json({ error: "Failed to fetch call log" }, { status: 500 });
    }

    // Index call log by session ID for fast lookup
    const bySession: Record<string, any> = {};
    for (const rec of callLogRecords) {
      const sid = rec.sessionId || rec.telephonySessionId;
      if (sid) {
        // Prefer records with recordings
        if (!bySession[sid] || rec.recording?.id) {
          bySession[sid] = rec;
        }
      }
    }

    let updated = 0;

    for (const activity of needsUpdate) {
      const meta = (activity as any).metadata as any;
      const sessionId = meta?.sessionId;
      const callLogEntry = bySession[sessionId];

      if (!callLogEntry) continue;

      const updates: any = { ...meta };
      let contentUpdated = false;
      let newContent = activity.content || "";

      // Backfill duration
      if (meta.duration === 0 && callLogEntry.duration > 0) {
        updates.duration = callLogEntry.duration;
        const durationMin = Math.ceil(callLogEntry.duration / 60);
        // Update content to include duration
        if (!newContent.includes(" min") && !newContent.includes("m ")) {
          newContent = newContent.replace(
            /(\([^)]+\))(\s*$)/,
            `$1 — ${durationMin} min`
          );
          contentUpdated = true;
        }
      }

      // Backfill recording
      if (!meta.recordingUrl && callLogEntry.recording?.id) {
        try {
          // Store just the recording ID — we'll proxy it through our own endpoint
          updates.recordingId = callLogEntry.recording.id;
          updates.recordingUrl = `/api/ringcentral/recording/${callLogEntry.recording.id}`;

          if (!newContent.includes("Recording:")) {
            newContent += `\n🎙️ Recording: /api/ringcentral/recording/${callLogEntry.recording.id}`;
            contentUpdated = true;
          }
        } catch {}
      }

      // Backfill start time if missing
      if (!meta.startTime && callLogEntry.startTime) {
        updates.startTime = callLogEntry.startTime;
      }

      // Write updates
      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          metadata: updates,
          ...(contentUpdated ? { content: newContent } : {}),
        },
      });
      updated++;
    }

    logger.info("Recording backfill complete", { checked: needsUpdate.length, updated });
    return NextResponse.json({ updated, checked: needsUpdate.length });
  } catch (error: any) {
    logger.error("Backfill recordings error", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
