import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/meth-decon-report/[id]/personnel
 * Auto-populate personnel from project workers with their meth-related certifications
 * Returns array of { workerId, name, role, certifications: [{ name, number, expires }] }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    // Get the report to find the project
    const report = await prisma.methDeconReport.findUnique({
      where: { id: params.id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Verify org access
    if (orgId && report.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get all project workers with their worker and certification data
    const projectWorkers = await prisma.projectWorker.findMany({
      where: { projectId: report.projectId },
      include: {
        worker: {
          include: {
            certifications: true,
          },
        },
      },
    });

    // Map to personnel format with meth-related certifications
    const personnel = projectWorkers
      .map((pw: any) => {
        // Filter for meth-related certifications
        // Common meth cert names: "Meth Remediation", "Meth Decontamination", etc.
        const methCerts = (pw.worker.certifications || []).filter((cert: any) =>
          cert.name?.toLowerCase().includes("meth")
        );

        return {
          workerId: pw.workerId,
          name: pw.worker.name,
          role: pw.role || pw.worker.role,
          certifications: methCerts.map((cert: any) => ({
            id: cert.id,
            name: cert.name,
            number: cert.number,
            issued: cert.issued,
            expires: cert.expires,
            status: cert.status,
          })),
        };
      })
      // Only include workers with meth certifications
      .filter((p: any) => p.certifications.length > 0);

    return NextResponse.json(personnel);
  } catch (error: any) {
    console.error("Meth decon personnel GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
