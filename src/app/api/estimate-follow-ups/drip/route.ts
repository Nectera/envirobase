import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getEstimateFollowUpConfig,
  ESTIMATE_FOLLOWUP_SEQUENCE,
  sendFollowUpTouch,
} from "@/lib/estimate-followup-config";

/**
 * POST /api/estimate-follow-ups/drip
 *
 * Cron-triggered endpoint that processes the estimate follow-up drip sequence.
 * Finds all follow-ups where:
 *   - nextTouchAt <= now
 *   - sequenceComplete is false
 *   - status is "active"
 *
 * Before sending, checks if the estimate status has changed from "sent"
 * (i.e., approved or rejected) — if so, cancels the sequence.
 *
 * Protected by CRON_SECRET header.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getEstimateFollowUpConfig();

    // If follow-ups are disabled globally, skip
    if (!config.enabled) {
      return NextResponse.json({ message: "Estimate follow-ups are disabled", processed: 0 });
    }

    const sequence = config.sequence || ESTIMATE_FOLLOWUP_SEQUENCE;
    const now = new Date();

    // Find follow-ups that need their next touch
    const pending = await prisma.estimateFollowUp.findMany({
      where: {
        nextTouchAt: { lte: now },
        sequenceComplete: false,
        status: "active",
      },
      include: {
        estimate: { select: { id: true, status: true } },
      },
      take: 50,
    });

    let processed = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const results: { id: string; touch: number; success: boolean; error?: string }[] = [];

    for (const fu of pending) {
      processed++;

      // Check if estimate status changed (approved, rejected, draft)
      // If it's no longer "sent", cancel the sequence
      if (fu.estimate?.status !== "sent") {
        await prisma.estimateFollowUp.update({
          where: { id: fu.id },
          data: {
            status: "completed",
            sequenceComplete: true,
            nextTouchAt: null,
            cancelledReason: `Estimate status changed to "${fu.estimate?.status || "unknown"}"`,
          },
        });
        skipped++;
        continue;
      }

      const touchIndex = fu.touchesSent;

      // Check if we've exhausted the sequence
      if (touchIndex >= sequence.length) {
        await prisma.estimateFollowUp.update({
          where: { id: fu.id },
          data: {
            status: "completed",
            sequenceComplete: true,
            nextTouchAt: null,
          },
        });
        skipped++;
        continue;
      }

      // Send the touch
      const result = await sendFollowUpTouch(
        { clientName: fu.clientName, clientEmail: fu.clientEmail },
        touchIndex,
        config
      );

      results.push({
        id: fu.id,
        touch: touchIndex + 1,
        success: result.success,
        error: result.error,
      });

      // Calculate next touch
      const nextIndex = touchIndex + 1;
      const isLastTouch = nextIndex >= sequence.length;
      let nextTouchAt: Date | null = null;

      if (!isLastTouch) {
        const nextStep = sequence[nextIndex];
        const currentStep = sequence[touchIndex];
        nextTouchAt = new Date();
        const daysBetween = nextStep.delayDays - currentStep.delayDays;
        nextTouchAt.setDate(nextTouchAt.getDate() + Math.max(daysBetween, 1));
      }

      if (result.success) {
        sent++;
        await prisma.estimateFollowUp.update({
          where: { id: fu.id },
          data: {
            touchesSent: touchIndex + 1,
            lastTouchAt: now,
            nextTouchAt: isLastTouch ? null : nextTouchAt,
            sequenceComplete: isLastTouch,
            status: isLastTouch ? "completed" : "active",
          },
        });
      } else {
        failed++;
        await prisma.estimateFollowUp.update({
          where: { id: fu.id },
          data: {
            touchesSent: touchIndex + 1,
            lastTouchAt: now,
            nextTouchAt: isLastTouch ? null : nextTouchAt,
            sequenceComplete: isLastTouch,
            status: isLastTouch ? "completed" : "active",
            failureReason: `Touch ${touchIndex + 1} failed: ${result.error}`,
          },
        });
      }
    }

    return NextResponse.json({ processed, sent, skipped, failed, results });
  } catch (error: any) {
    console.error("Estimate follow-up drip error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
