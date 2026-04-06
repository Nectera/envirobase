import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { pushEventToAllConnected } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const office = searchParams.get("office");
  const type = searchParams.get("type");

  const where: any = orgWhere(orgId);
  if (type) where.type = type;
  if (office) where.office = office;
  if (startDate && endDate) {
    where.startDate = { lte: endDate };
    where.endDate = { gte: startDate };
  }

  const events = await prisma.calendarEvent.findMany({ where });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = session.user.role || "TECHNICIAN";
    const isAdmin = role === "ADMIN" || role === "PROJECT_MANAGER" || role === "SUPERVISOR";

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin or supervisor access required" }, { status: 403 });
    }

    const body = await req.json();

    const event = await prisma.calendarEvent.create({
      data: orgData(orgId, {
        title: body.title,
        type: body.type || "other",
        description: body.description || null,
        startDate: body.startDate,
        endDate: body.endDate || body.startDate,
        allDay: body.allDay !== false,
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        office: body.office || null,
        color: body.color || getDefaultColor(body.type),
        createdBy: session.user.id || null,
      }),
    });

    // Push to Google Calendar for all connected users in this org (fire-and-forget)
    if (orgId) {
      pushEventToAllConnected(orgId, {
        title: event.title || "Untitled Event",
        description: event.description,
        startDate: event.startDate || body.startDate,
        endDate: event.endDate || event.startDate || body.startDate,
        allDay: event.allDay,
        startTime: event.startTime,
        endTime: event.endTime,
      })
        .then(async (googleIds) => {
          const firstGoogleId = Object.values(googleIds)[0];
          if (firstGoogleId) {
            await prisma.calendarEvent.update({
              where: { id: event.id },
              data: { googleEventId: firstGoogleId },
            }).catch(() => {});
          }
        })
        .catch((err: any) => console.error("Google Calendar sync error:", err));
    }

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 400 });
  }
}

function getDefaultColor(type: string): string {
  switch (type) {
    case "holiday": return "#EF4444";
    case "training": return "#06B6D4";
    case "meeting": return "#A855F7";
    case "inspection": return "#F97316";
    case "company_event": return "#7BC143";
    default: return "#6B7280";
  }
}
