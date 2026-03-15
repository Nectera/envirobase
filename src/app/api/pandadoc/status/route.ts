import { NextRequest, NextResponse } from "next/server";
import { getConnectionStatus, disconnect, saveApiKey } from "@/lib/pandadoc";
import { requireOrg } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session } = result;

    return NextResponse.json(await getConnectionStatus());
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Save API key
export async function POST(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session } = result;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { apiKey } = await req.json();
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }
    saveApiKey(apiKey.trim());
    return NextResponse.json({ connected: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session } = result;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    disconnect();
    return NextResponse.json({ disconnected: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
