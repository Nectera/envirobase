import { NextResponse } from "next/server";
import { getConnectionStatus, disconnect } from "@/lib/gusto";
import { requireOrg } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const status = await getConnectionStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    disconnect();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
