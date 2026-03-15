import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { updateWorkerSchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const worker = await prisma.worker.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: {
        certifications: { orderBy: { expires: "asc" } },
        medicalRecords: { orderBy: { examDate: "desc" } },
        projects: { include: { project: true } },
      },
    });

    if (!worker) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(worker);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    const v = validateBody(updateWorkerSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.role !== undefined) data.role = body.role;
    if (body.position !== undefined) data.position = body.position;
    if (body.types !== undefined) data.types = Array.isArray(body.types) ? body.types.join(",") : body.types;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.email !== undefined) data.email = body.email;
    if (body.photoUrl !== undefined) data.photoUrl = body.photoUrl;
    if (body.address !== undefined) data.address = body.address;
    if (body.homeCity !== undefined) data.homeCity = body.homeCity;
    if (body.homeState !== undefined) data.homeState = body.homeState;
    if (body.homeZip !== undefined) data.homeZip = body.homeZip;
    if (body.emergencyContactName !== undefined) data.emergencyContactName = body.emergencyContactName;
    if (body.emergencyContactPhone !== undefined) data.emergencyContactPhone = body.emergencyContactPhone;
    if (body.city !== undefined) data.city = body.city;
    if (body.state !== undefined) data.state = body.state;
    if (body.status !== undefined) data.status = body.status;
    if (body.skillRating !== undefined) data.skillRating = body.skillRating !== null ? Number(body.skillRating) : null;

    // Verify worker belongs to org
    const existingWorker = await prisma.worker.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingWorker) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const worker = await prisma.worker.update({
      where: { id: params.id },
      data,
    });

    // Sync role to linked User account if role changed
    if (body.role !== undefined && worker.userId) {
      await prisma.user.update({
        where: { id: worker.userId },
        data: { role: body.role },
      }).catch(() => {}); // Non-critical, don't fail the request
    }

    return NextResponse.json(worker);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Verify worker belongs to org
    const existingWorker = await prisma.worker.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingWorker) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.worker.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
