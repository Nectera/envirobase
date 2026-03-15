import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getReviewConfig, DRIP_SEQUENCE } from "@/lib/review-config";
import { sendTouch, buildSurveyUrl } from "../route";

/**
 * POST /api/review-requests/drip
 *
 * Cron-triggered endpoint that processes the drip sequence.
 * Finds all review requests where:
 *   - nextTouchAt <= now
 *   - surveyCompletedAt is null (customer hasn't responded yet)
 *   - sequenceComplete is false
 *   - status is "sent" (successfully sent at least once)
 *
 * For each, sends the next touch and schedules the following one.
 * Call this via Vercel Cron every hour (or similar).
 *
 * Protected by CRON_SECRET header to prevent abuse.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this automatically for cron jobs)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getReviewConfig();
    const sequence = config.sequence || DRIP_SEQUENCE;
    const now = new Date();

    // Find review requests that need their next touch
    const pending = await prisma.reviewRequest.findMany({
      where: {
        nextTouchAt: { lte: now },
        surveyCompletedAt: null, // Customer hasn't responded
        sequenceComplete: false,
        status: "sent", // At least touch 1 succeeded
      },
      take: 50, // Process in batches
    });

    let processed = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const results: { id: string; touch: number; channel: string; success: boolean; error?: string }[] = [];

    for (const rr of pending) {
      processed++;
      const touchIndex = rr.touchesSent; // 0-indexed: if 1 sent, next is index 1

      // Check if we've exhausted the sequence
      if (touchIndex >= sequence.length) {
        await prisma.reviewRequest.update({
          where: { id: rr.id },
          data: { sequenceComplete: true, nextTouchAt: null, nextTouchType: null },
        });
        skipped++;
        continue;
      }

      // Double-check: if customer already completed survey, skip
      const fresh = await prisma.reviewRequest.findUnique({
        where: { id: rr.id },
        select: { surveyCompletedAt: true },
      });
      if (fresh?.surveyCompletedAt) {
        await prisma.reviewRequest.update({
          where: { id: rr.id },
          data: { sequenceComplete: true, nextTouchAt: null, nextTouchType: null },
        });
        skipped++;
        continue;
      }

      // Send the touch
      const result = await sendTouch(
        {
          token: rr.token,
          clientName: rr.clientName,
          clientEmail: rr.clientEmail,
          clientPhone: rr.clientPhone,
        },
        touchIndex,
        config
      );

      results.push({
        id: rr.id,
        touch: touchIndex + 1,
        channel: result.channel,
        success: result.success,
        error: result.error,
      });

      // Calculate next touch
      const nextIndex = touchIndex + 1;
      const isLastTouch = nextIndex >= sequence.length;
      let nextTouchAt: Date | null = null;
      let nextTouchType: string | null = null;

      if (!isLastTouch) {
        const nextStep = sequence[nextIndex];
        nextTouchAt = new Date();
        // Delay from the CURRENT touch's send time, not from the sequence start
        // e.g. Touch 3 is +3 days from touch 2 (which was +2 days from touch 1)
        const daysBetween = nextStep.delayDays - sequence[touchIndex].delayDays;
        nextTouchAt.setDate(nextTouchAt.getDate() + Math.max(daysBetween, 1));
        nextTouchType = nextStep.channel;
      }

      if (result.success) {
        sent++;
        await prisma.reviewRequest.update({
          where: { id: rr.id },
          data: {
            touchesSent: touchIndex + 1,
            lastTouchAt: now,
            nextTouchAt: isLastTouch ? null : nextTouchAt,
            nextTouchType: isLastTouch ? null : nextTouchType,
            sequenceComplete: isLastTouch,
          },
        });
      } else {
        failed++;
        // On failure, still schedule the next touch (skip this one)
        await prisma.reviewRequest.update({
          where: { id: rr.id },
          data: {
            touchesSent: touchIndex + 1, // Count it as attempted
            lastTouchAt: now,
            nextTouchAt: isLastTouch ? null : nextTouchAt,
            nextTouchType: isLastTouch ? null : nextTouchType,
            sequenceComplete: isLastTouch,
            failureReason: `Touch ${touchIndex + 1} failed: ${result.error}`,
          },
        });
      }
    }

    return NextResponse.json({
      processed,
      sent,
      skipped,
      failed,
      results,
    });
  } catch (error: any) {
    console.error("Drip processor error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
