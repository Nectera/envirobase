import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "@/lib/ringcentral";
import { requireOrg } from "@/lib/org-context";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const RC_SERVER = process.env.RINGCENTRAL_SERVER_URL || "https://platform.ringcentral.com";

/**
 * GET /api/ringcentral/recording/[id]
 *
 * Proxies a RingCentral recording through our server so the
 * browser can play it without needing the RC access token.
 * Returns the audio content with proper headers for playback.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const authResult = await requireOrg();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const auth = await getValidToken();
    if (!auth) {
      return NextResponse.json({ error: "RingCentral not connected" }, { status: 503 });
    }

    // First get the recording metadata to find the content URI
    const metaRes = await fetch(
      `${RC_SERVER}/restapi/v1.0/account/~/recording/${params.id}`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!metaRes.ok) {
      logger.warn("Recording metadata fetch failed", { id: params.id, status: metaRes.status });
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const meta = await metaRes.json();
    const contentUri = meta.contentUri;

    if (!contentUri) {
      return NextResponse.json({ error: "No content URI for recording" }, { status: 404 });
    }

    // Fetch the actual audio content
    const audioRes = await fetch(`${contentUri}`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });

    if (!audioRes.ok) {
      logger.warn("Recording content fetch failed", { id: params.id, status: audioRes.status });
      return NextResponse.json({ error: "Failed to fetch recording" }, { status: 502 });
    }

    const contentType = audioRes.headers.get("content-type") || "audio/mpeg";
    const audioBuffer = await audioRes.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="recording-${params.id}.mp3"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    logger.error("Recording proxy error", { id: params.id, error: error.message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
