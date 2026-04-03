import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const project = await prisma.pastProject.findFirst({
      where: { id: params.id, ...orgWhere(orgId) },
      include: { photos: { orderBy: { createdAt: "asc" } } },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Past project fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const existing = await prisma.pastProject.findFirst({
      where: { id: params.id, ...orgWhere(orgId) },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data: any = {};
    if (body.serviceType !== undefined) data.serviceType = body.serviceType;
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.location !== undefined) data.location = body.location;
    if (body.squareFeet !== undefined) data.squareFeet = body.squareFeet;
    if (body.completionDate !== undefined) data.completionDate = body.completionDate || null;
    if (body.testimonial !== undefined) data.testimonial = body.testimonial;
    if (body.featured !== undefined) data.featured = body.featured;
    if (body.displayOrder !== undefined) data.displayOrder = body.displayOrder;

    const project = await prisma.pastProject.update({
      where: { id: params.id },
      data,
      include: { photos: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Past project update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const existing = await prisma.pastProject.findFirst({
      where: { id: params.id, ...orgWhere(orgId) },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.pastProject.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Past project delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
