import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

// GET – single time entry
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entry = await prisma.timeEntry.findUnique({
      where: { id: params.id },
      include: { project: true, worker: true },
    });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(entry);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT – clock out or update entry (break minutes, notes, etc.)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const existing = await prisma.timeEntry.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: any = {};

    // Admin edit: manual clockIn time change
    if (body.clockIn && body.clockIn !== "now") {
      updateData.clockIn = new Date(body.clockIn).toISOString();
    }

    // Admin edit: change project
    if (body.projectId !== undefined) {
      updateData.projectId = body.projectId || null;
    }

    // Clock out
    if (body.clockOut === "now") {
      const clockOutTime = new Date();
      const clockInTime = new Date(updateData.clockIn || existing.clockIn);
      const diffMs = clockOutTime.getTime() - clockInTime.getTime();
      const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

      updateData.clockOut = clockOutTime.toISOString();
      updateData.hours = Math.max(0, hours);
    } else if (body.clockOut) {
      // Manual clock out time
      const clockOutTime = new Date(body.clockOut);
      const clockInTime = new Date(updateData.clockIn || existing.clockIn);
      const diffMs = clockOutTime.getTime() - clockInTime.getTime();
      const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

      updateData.clockOut = clockOutTime.toISOString();
      updateData.hours = Math.max(0, hours);
    }

    // If clockIn was changed but clockOut already exists, recalculate hours
    if (updateData.clockIn && !updateData.clockOut && existing.clockOut) {
      const clockInTime = new Date(updateData.clockIn);
      const clockOutTime = new Date(existing.clockOut);
      const diffMs = clockOutTime.getTime() - clockInTime.getTime();
      const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      updateData.hours = Math.max(0, hours);
    }

    if (body.notes !== undefined) updateData.notes = body.notes;

    // GPS location on clock-out
    if (body.clockOutLat !== undefined) updateData.clockOutLat = body.clockOutLat;
    if (body.clockOutLng !== undefined) updateData.clockOutLng = body.clockOutLng;
    if (body.clockOutAddress) updateData.clockOutAddress = body.clockOutAddress;

const updated = await prisma.timeEntry.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await prisma.timeEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
