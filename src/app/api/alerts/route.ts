import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const alerts = await prisma.alert.findMany({
      where: { ...orgWhere(orgId), dismissed: false },
      orderBy: [{ severity: "asc" }, { date: "desc" }],
      include: { project: true, worker: true },
    });

    return NextResponse.json(alerts);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    if (body.id && body.dismissed !== undefined) {
      const alert = await prisma.alert.update({
        where: { id: body.id },
        data: { dismissed: body.dismissed },
      });
      return NextResponse.json(alert);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
