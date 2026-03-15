import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import {
  getConnectionStatus,
  createConnection,
  disconnect,
  isConfigured,
} from "@/lib/conductor";

// GET /api/quickbooks-desktop/status — check connection status
export async function GET() {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session } = auth;

  const status = await getConnectionStatus();
  return NextResponse.json(status);
}

// POST /api/quickbooks-desktop/status — initiate connection
export async function POST() {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session } = auth;

  if (!isConfigured()) {
    return NextResponse.json({
      error: "QuickBooks Desktop integration requires Conductor credentials. Add CONDUCTOR_API_KEY and CONDUCTOR_SECRET_KEY to your environment variables. Sign up at conductor.is.",
    }, { status: 400 });
  }

  const connResult = await createConnection();
  if (connResult.error) {
    return NextResponse.json({ error: connResult.error }, { status: 400 });
  }

  return NextResponse.json({
    authSessionUrl: connResult.authSessionUrl,
    message: "Conductor auth session created. Direct the user to the auth URL to link their QuickBooks Desktop.",
  });
}

// DELETE /api/quickbooks-desktop/status — disconnect
export async function DELETE() {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session } = auth;

  await disconnect();
  return NextResponse.json({ disconnected: true });
}
