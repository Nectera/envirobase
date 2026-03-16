import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWorkerSchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const workers = await prisma.worker.findMany({
      where: orgWhere(orgId),
      include: {
        certifications: true,
        medicalRecords: { orderBy: { examDate: "desc" }, take: 1 },
        projects: { include: { project: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(workers);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    const v = validateBody(createWorkerSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    const worker = await prisma.worker.create({
      data: orgData(orgId, {
        name: body.name,
        role: body.role,
        position: body.position || null,
        types: Array.isArray(body.types) ? body.types.join(",") : body.types,
        phone: body.phone || null,
        email: body.email || null,
        photoUrl: body.photoUrl || null,
        address: body.address || null,
        homeCity: body.homeCity || null,
        homeState: body.homeState || null,
        homeZip: body.homeZip || null,
        emergencyContactName: body.emergencyContactName || null,
        emergencyContactPhone: body.emergencyContactPhone || null,
        city: body.city || null,
        state: body.state || null,
        status: body.status || "active",
      }),
    });

    return NextResponse.json(worker, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
