import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { getAuthUri } from "@/lib/quickbooks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.QUICKBOOKS_CLIENT_ID || !process.env.QUICKBOOKS_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "QuickBooks credentials not configured. Add QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET to .env.local" },
        { status: 500 }
      );
    }

    const authUri = getAuthUri();
    return NextResponse.json({ authUri });
  } catch (error: any) {
    logger.error("QB auth error:", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
