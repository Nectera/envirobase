import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { sendFieldReportEmail } from "@/lib/fieldReportEmail";

export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const report = await prisma.dailyFieldReport.findUnique({
      where: orgWhere(orgId, { id: params.id }),
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.status === "draft") {
      return NextResponse.json(
        { error: "Cannot resend a draft report. Submit it first." },
        { status: 400 }
      );
    }

    await sendFieldReportEmail(report.id, report.projectId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Field report resend failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resend report" },
      { status: 500 }
    );
  }
}
