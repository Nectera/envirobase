import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/temp-workers — list all temp workers (active by default)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const includeInactive = req.nextUrl.searchParams.get("all") === "true";
    const where: any = { isTemp: true, organizationId: orgId };
    if (!includeInactive) where.status = "active";

    const temps = await prisma.worker.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(temps);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/temp-workers — quick-create a temp worker
 * Body: { name, agency?, certifications?: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { name, agency, certifications } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const certsStr = Array.isArray(certifications) ? certifications.join(",") : certifications || null;

    const worker = await prisma.worker.create({
      data: {
        name: name.trim(),
        role: "Temp Technician",
        position: "Technician",
        isTemp: true,
        tempAgency: agency?.trim() || null,
        tempCertifications: certsStr,
        types: certsStr, // Also populate the standard types field for project compatibility
        status: "active",
        organizationId: orgId,
      },
    });

    return NextResponse.json(worker, { status: 201 });
  } catch (error: any) {
    console.error("Temp worker creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
