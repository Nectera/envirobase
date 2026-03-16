import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { sendFieldReportEmail } from "@/lib/fieldReportEmail";

export const dynamic = "force-dynamic";

export const maxDuration = 30; // Allow time for AI summary + email on submission

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const report = await prisma.dailyFieldReport.findUnique({
      where: orgWhere(orgId, { id: params.id }),
      include: { project: true },
    });
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Get existing report to detect status change
    const existing = await prisma.dailyFieldReport.findUnique({ where: orgWhere(orgId, { id: params.id }) });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { projectId, date, status, ...extraFields } = body;

    const updateData: any = {};
    if (date !== undefined) updateData.date = date;
    if (status !== undefined) updateData.status = status;
    if (Object.keys(extraFields).length > 0) updateData.data = extraFields;

    const report = await prisma.dailyFieldReport.update({
      where: orgWhere(orgId, { id: params.id }),
      data: updateData,
    });

    // Send AI-summarized email if status changed to submitted
    // Must await on Vercel — fire-and-forget gets killed when the response is sent
    if (status === "submitted" && existing.status !== "submitted") {
      const pid = projectId || existing.projectId;
      try {
        await sendFieldReportEmail(report.id, pid);
      } catch (err) {
        console.error("Field report email send failed:", err);
      }
    }

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await prisma.dailyFieldReport.delete({ where: orgWhere(orgId, { id: params.id }) });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
