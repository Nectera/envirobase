import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const role = (session?.user as any)?.role || "TECHNICIAN";
    if (role !== "ADMIN" && role !== "PROJECT_MANAGER" && role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Admin or supervisor access required" }, { status: 403 });
    }

    const existing = await prisma.calendarEvent.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.startDate !== undefined) updateData.startDate = body.startDate;
    if (body.endDate !== undefined) updateData.endDate = body.endDate;
    if (body.allDay !== undefined) updateData.allDay = body.allDay;
    if (body.startTime !== undefined) updateData.startTime = body.startTime;
    if (body.endTime !== undefined) updateData.endTime = body.endTime;
    if (body.office !== undefined) updateData.office = body.office;
    if (body.color !== undefined) updateData.color = body.color;

    const updated = await prisma.calendarEvent.update({ where: { id: params.id }, data: updateData });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const role = (session?.user as any)?.role || "TECHNICIAN";
    if (role !== "ADMIN" && role !== "PROJECT_MANAGER" && role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Admin or supervisor access required" }, { status: 403 });
    }

    const existing = await prisma.calendarEvent.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.calendarEvent.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 400 });
  }
}
