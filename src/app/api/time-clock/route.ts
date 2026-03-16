import { NextResponse, NextRequest } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET – list time entries, optionally filtered by projectId, workerId, date
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const workerId = url.searchParams.get("workerId");
    const date = url.searchParams.get("date");
    const activeOnly = url.searchParams.get("active"); // "true" = only open entries

    const where: any = orgWhere(orgId);
    if (projectId) where.projectId = projectId;
    if (workerId) where.workerId = workerId;
    if (date) where.date = date;
    if (activeOnly === "true") where.clockOut = null;

    const entries = await prisma.timeEntry.findMany({
      where,
      include: { project: true, worker: true },
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST – clock in
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
    const { projectId, workerId, clockInLat, clockInLng, clockInAddress } = body;

    if (!workerId) {
      return NextResponse.json({ error: "Missing required fields: workerId" }, { status: 400 });
    }

// Check if this worker already has an open clock-in
    const openEntries = await prisma.timeEntry.findMany({
      where: { ...orgWhere(orgId), workerId, clockOut: null },
    });
    if (openEntries.length > 0) {
      return NextResponse.json(
        { error: "Worker is already clocked in", activeEntry: openEntries[0] },
        { status: 409 }
      );
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    const entry = await prisma.timeEntry.create({
      data: orgData(orgId, {
        projectId: projectId || null,
        workerId,
        date: dateStr,
        clockIn: now.toISOString(),
        clockOut: null,
        hours: null,
        notes: "",
        clockInLat: clockInLat ?? null,
        clockInLng: clockInLng ?? null,
        clockInAddress: clockInAddress || null,
      }),
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
