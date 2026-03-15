import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PLUGINS } from "@/lib/plugins";

// GET /api/plugins/status — returns connection status for all plugins
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all integration auth records
    const integrations = await prisma.integrationAuth.findMany();
    const connectedMap: Record<string, any> = {};
    for (const auth of integrations) {
      connectedMap[auth.provider] = auth.data;
    }

    // Build status for each plugin
    const statuses = PLUGINS.map((plugin) => {
      const authData = connectedMap[plugin.slug];
      const connected = !!authData;

      return {
        slug: plugin.slug,
        connected,
        comingSoon: plugin.comingSoon || false,
        // Include connection metadata if connected
        ...(connected && authData && typeof authData === "object"
          ? {
              connectedAt: (authData as any).connectedAt,
              companyName: (authData as any).companyName,
              phoneNumber: (authData as any).phoneNumber,
            }
          : {}),
      };
    });

    return NextResponse.json({ statuses });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch plugin statuses" }, { status: 500 });
  }
}
