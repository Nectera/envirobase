import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/meth-decon-report
 * List meth decon reports, optionally filter by projectId
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");

    const where: any = orgWhere(orgId, {});
    if (projectId) where.projectId = projectId;

    const reports = await prisma.methDeconReport.findMany({
      where,
      include: { project: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error: any) {
    console.error("Meth decon report GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meth-decon-report
 * Create a new meth decon report for a project
 */
export async function POST(req: NextRequest) {
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
    const { projectId, ...fields } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Check if project exists and belongs to the org
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Verify org access
    if (orgId && project.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const report = await prisma.methDeconReport.create({
      data: orgData(orgId, {
        projectId,
        status: fields.status || "draft",
        date: fields.date || new Date().toISOString().split("T")[0],
        personnel: fields.personnel || null,
        deconProcedure: fields.deconProcedure || null,
        removalProcedure: fields.removalProcedure || null,
        encapsulation: fields.encapsulation || null,
        wasteManagement: fields.wasteManagement || null,
        variationsFromStd: fields.variationsFromStd || null,
        completionDate: fields.completionDate || null,
        signedByName: fields.signedByName || null,
        signedByTitle: fields.signedByTitle || null,
        signedDate: fields.signedDate || null,
        wasteManifestPhotos: fields.wasteManifestPhotos || null,
        projectPhotos: fields.projectPhotos || null,
        certificationFiles: fields.certificationFiles || null,
      }),
      include: { project: true },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    console.error("Meth decon report POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
