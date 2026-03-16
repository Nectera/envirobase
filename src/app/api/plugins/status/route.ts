import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import prisma from "@/lib/prisma";
import { PLUGINS } from "@/lib/plugins";

export const dynamic = "force-dynamic";

// GET /api/plugins/status — returns connection status for all plugins
export async function GET() {
  const result = await requireOrg();
  if (result instanceof NextResponse) return result;
  const { session } = result;

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
