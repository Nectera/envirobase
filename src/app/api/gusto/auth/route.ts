import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { getAuthUri } from "@/lib/gusto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.GUSTO_CLIENT_ID || !process.env.GUSTO_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "Gusto credentials not configured. Add GUSTO_CLIENT_ID and GUSTO_CLIENT_SECRET to .env.local" },
        { status: 500 }
      );
    }

    const authUri = getAuthUri();
    return NextResponse.json({ authUri });
  } catch (error: any) {
    logger.error("Gusto auth error:", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
