import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { sendFieldReportEmail } from "@/lib/fieldReportEmail";

export const maxDuration = 30; // Allow time for AI summary + email on submission

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const projectId = req.nextUrl.searchParams.get("projectId");
    const where: any = orgWhere(orgId);
    if (projectId) where.projectId = projectId;

    const rawReports = await prisma.dailyFieldReport.findMany({
      where,
      include: { project: true },
    });
    // Flatten data JSON fields onto each report for frontend compatibility
    const reports = rawReports.map((r: any) => ({
      ...r,
      ...(r.data && typeof r.data === "object" ? r.data : {}),
    }));
    return NextResponse.json(reports);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    // Extract core fields; store everything else in data JSON
    const { projectId, date, status, ...extraFields } = body;

    const reportStatus = status || "draft";
    const report = await prisma.dailyFieldReport.create({
      data: orgData(orgId, {
        projectId,
        date: date || new Date().toISOString().split("T")[0],
        status: reportStatus,
        data: Object.keys(extraFields).length > 0 ? extraFields : null,
      }),
    });

    // Send AI-summarized email to customer on submission
    // Must await on Vercel — fire-and-forget gets killed when the response is sent
    if (reportStatus === "submitted" && projectId) {
      try {
        await sendFieldReportEmail(report.id, projectId);
      } catch (err) {
        console.error("Field report email send failed:", err);
      }
    }

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    console.error("Field report creation error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
