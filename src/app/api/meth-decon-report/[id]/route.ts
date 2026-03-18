import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

/**
 * GET /api/meth-decon-report/[id]
 * Get a single meth decon report by ID, include project data
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const report = await prisma.methDeconReport.findUnique({
      where: { id: params.id },
      include: { project: true },
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

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Meth decon report GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/meth-decon-report/[id]
 * Update a meth decon report
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Get current report to verify org access
    const currentReport = await prisma.methDeconReport.findUnique({
      where: { id: params.id },
    });

    if (!currentReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (orgId && currentReport.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Build update data, only including provided fields
    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.personnel !== undefined) updateData.personnel = body.personnel;
    if (body.deconProcedure !== undefined) updateData.deconProcedure = body.deconProcedure;
    if (body.removalProcedure !== undefined) updateData.removalProcedure = body.removalProcedure;
    if (body.encapsulation !== undefined) updateData.encapsulation = body.encapsulation;
    if (body.wasteManagement !== undefined) updateData.wasteManagement = body.wasteManagement;
    if (body.variationsFromStd !== undefined) updateData.variationsFromStd = body.variationsFromStd;
    if (body.completionDate !== undefined) updateData.completionDate = body.completionDate;
    if (body.signedByName !== undefined) updateData.signedByName = body.signedByName;
    if (body.signedByTitle !== undefined) updateData.signedByTitle = body.signedByTitle;
    if (body.signedDate !== undefined) updateData.signedDate = body.signedDate;
    if (body.wasteManifestPhotos !== undefined) updateData.wasteManifestPhotos = body.wasteManifestPhotos;
    if (body.projectPhotos !== undefined) updateData.projectPhotos = body.projectPhotos;
    if (body.certificationFiles !== undefined) updateData.certificationFiles = body.certificationFiles;

    const report = await prisma.methDeconReport.update({
      where: { id: params.id },
      data: updateData,
      include: { project: true },
    });

    return NextResponse.json(report);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    console.error("Meth decon report PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meth-decon-report/[id]
 * Delete a meth decon report
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Get report to verify org access
    const report = await prisma.methDeconReport.findUnique({
      where: { id: params.id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (orgId && report.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await prisma.methDeconReport.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    console.error("Meth decon report DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
