import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { generateFieldReportPdf } from "@/lib/fieldReportPdf";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const raw = await prisma.dailyFieldReport.findUnique({
      where: orgWhere(orgId, { id: params.id }),
      include: { project: true },
    });
    if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Extract the data JSON fields — all form values are stored in the data column
    const d: any = (raw.data && typeof raw.data === "object") ? raw.data : {};
    const report: any = {
      id: raw.id,
      projectId: raw.projectId,
      date: raw.date,
      status: raw.status,
      project: (raw as any).project,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      ...d,
    };

    const { buffer, filename } = await generateFieldReportPdf(report, { name: report.project?.name || "Report" });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[DFR-PDF] Error generating PDF:", error?.message, error?.stack);
    return NextResponse.json(
      { error: "PDF generation failed", message: error?.message || "Unknown error", stack: error?.stack?.split("\n").slice(0, 5) },
      { status: 500 }
    );
  }
}
