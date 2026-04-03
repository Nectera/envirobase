import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const projects = await prisma.pastProject.findMany({
      where: orgWhere(orgId),
      include: { photos: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ serviceType: "asc" }, { displayOrder: "asc" }],
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Past projects fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    if (!body.serviceType || !body.name) {
      return NextResponse.json({ error: "serviceType and name are required" }, { status: 400 });
    }

    const project = await prisma.pastProject.create({
      data: orgData(orgId, {
        serviceType: body.serviceType,
        name: body.name,
        description: body.description || null,
        location: body.location || null,
        squareFeet: body.squareFeet || null,
        completionDate: body.completionDate || null,
        testimonial: body.testimonial || null,
        featured: body.featured ?? true,
        displayOrder: body.displayOrder ?? 0,
      }),
      include: { photos: true },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("Past project creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
