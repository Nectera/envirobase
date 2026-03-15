import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { getAuthUri } from "@/lib/ringcentral";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.RINGCENTRAL_CLIENT_ID || !process.env.RINGCENTRAL_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "RingCentral credentials not configured. Add RINGCENTRAL_CLIENT_ID and RINGCENTRAL_CLIENT_SECRET to .env.local" },
        { status: 500 }
      );
    }

    const authUri = getAuthUri();
    return NextResponse.json({ authUri });
  } catch (error: any) {
    logger.error("RC auth error:", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
