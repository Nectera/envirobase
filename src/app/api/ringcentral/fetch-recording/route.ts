import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rcApiCall } from "@/lib/ringcentral";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow up to 2 minutes for retries

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/ringcentral/fetch-recording
 *
 * Called after a call ends to fetch the recording URL from RingCentral.
 * Retries with delays since recordings take time to process.
 * Updates the Activity record with the recording URL once found.
 */
export async function POST(request: NextRequest) {
  try {
    const { activityId, sessionId } = await request.json();
    if (!activityId || !sessionId) {
      return NextResponse.json({ error: "Missing activityId or sessionId" }, { status: 400 });
    }

    const delays = [10000, 20000, 40000]; // 10s, 20s, 40s
    for (const waitMs of delays) {
      await delay(waitMs);
      try {
        const callLog = await rcApiCall(
          "GET",
          `/account/~/extension/~/call-log?sessionId=${sessionId}&withRecording=true&view=Detailed`
        );
        const records = callLog?.records || [];
        const withRecording = records.find((r: any) => r.recording?.id);

        if (withRecording?.recording?.id) {
          let recordingUrl = withRecording.recording.contentUri || null;
          if (!recordingUrl) {
            try {
              const recData = await rcApiCall("GET", `/account/~/recording/${withRecording.recording.id}`);
              recordingUrl = recData?.contentUri || null;
            } catch {}
          }

          if (recordingUrl) {
            const activity = await prisma.activity.findUnique({ where: { id: activityId } });
            if (activity) {
              // Update content to include recording
              let updatedContent = activity.content || "";
              if (!updatedContent.includes("Recording:")) {
                updatedContent += `\n🎙️ Recording: ${recordingUrl}`;
              }

              // Also get duration from the call log if we didn't have it
              const callDuration = withRecording.duration || 0;
              const existingMeta = (activity as any).metadata || {};

              await prisma.activity.update({
                where: { id: activityId },
                data: {
                  content: updatedContent,
                  metadata: {
                    ...existingMeta,
                    recordingUrl,
                    // Update duration if it was 0 before and now we have it
                    ...(existingMeta.duration === 0 && callDuration > 0 ? { duration: callDuration } : {}),
                  },
                },
              });

              logger.info("Recording attached to activity", { activityId, sessionId, recordingUrl: recordingUrl.slice(0, 50) });
              return NextResponse.json({ success: true, recordingUrl });
            }
          }
        }
      } catch (err: any) {
        logger.warn("Recording fetch attempt failed", { sessionId, error: err.message });
      }
    }

    logger.info("No recording found after retries", { activityId, sessionId });
    return NextResponse.json({ success: false, message: "No recording found" });
  } catch (error: any) {
    logger.error("Fetch recording error", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
