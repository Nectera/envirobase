import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getConnectionStatus,
  createConnection,
  disconnect,
  isConfigured,
} from "@/lib/conductor";

// GET /api/quickbooks-desktop/status — check connection status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getConnectionStatus();
  return NextResponse.json(status);
}

// POST /api/quickbooks-desktop/status — initiate connection
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({
      error: "QuickBooks Desktop integration requires Conductor credentials. Add CONDUCTOR_API_KEY and CONDUCTOR_SECRET_KEY to your environment variables. Sign up at conductor.is.",
    }, { status: 400 });
  }

  const result = await createConnection();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    authSessionUrl: result.authSessionUrl,
    message: "Conductor auth session created. Direct the user to the auth URL to link their QuickBooks Desktop.",
  });
}

// DELETE /api/quickbooks-desktop/status — disconnect
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnect();
  return NextResponse.json({ disconnected: true });
}
