import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { updateProjectSchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { notifyClientStatusChange } from "@/lib/portalNotifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const project = await prisma.project.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: {
        tasks: { orderBy: { sortOrder: "asc" } },
        workers: { include: { worker: true } },
        alerts: true,
      },
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    const v = validateBody(updateProjectSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.address !== undefined) data.address = body.address;
    if (body.client !== undefined) data.client = body.client;
    if (body.clientPhone !== undefined) data.clientPhone = body.clientPhone || null;
    if (body.clientEmail !== undefined) data.clientEmail = body.clientEmail || null;
    if (body.startDate !== undefined) data.startDate = body.startDate || null;
    if (body.estEndDate !== undefined) data.estEndDate = body.estEndDate || null;
    if (body.permitNumber !== undefined) data.permitNumber = body.permitNumber;
    if (body.acmQuantity !== undefined) data.acmQuantity = body.acmQuantity;
    if (body.subtype !== undefined) data.subtype = body.subtype;
    if (body.notificationDate !== undefined) data.notificationDate = body.notificationDate || null;
    if (body.projectManagerId !== undefined) data.projectManagerId = body.projectManagerId || null;
    if (body.estimatedDays !== undefined) data.estimatedDays = body.estimatedDays !== null ? Number(body.estimatedDays) : null;
    if (body.estimatedLaborHours !== undefined) data.estimatedLaborHours = body.estimatedLaborHours !== null ? Number(body.estimatedLaborHours) : null;

    // Clearance results
    if (body.clearanceResult !== undefined) data.clearanceResult = body.clearanceResult || null;
    if (body.clearanceDate !== undefined) data.clearanceDate = body.clearanceDate || null;
    if (body.clearanceCost !== undefined) data.clearanceCost = body.clearanceCost !== null ? Number(body.clearanceCost) : null;
    if (body.clearanceVendor !== undefined) data.clearanceVendor = body.clearanceVendor || null;
    if (body.clearanceNotes !== undefined) data.clearanceNotes = body.clearanceNotes || null;
    if (body.clearanceReportUrl !== undefined) data.clearanceReportUrl = body.clearanceReportUrl || null;
    if (body.clearanceReportName !== undefined) data.clearanceReportName = body.clearanceReportName || null;
    if (body.clearanceInvoiceUrl !== undefined) data.clearanceInvoiceUrl = body.clearanceInvoiceUrl || null;
    if (body.clearanceInvoiceName !== undefined) data.clearanceInvoiceName = body.clearanceInvoiceName || null;

    // Subcontractor
    if (body.isSubbedOut !== undefined) data.isSubbedOut = body.isSubbedOut;
    if (body.subContractorId !== undefined) data.subContractorId = body.subContractorId || null;

    // Get current project to detect status change
    const currentProject = await prisma.project.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!currentProject) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const project = await prisma.project.update({
      where: { id: params.id },
      data,
    });

    // Notify portal clients on status change
    if (body.status && body.status !== (currentProject as any).status && orgId) {
      notifyClientStatusChange(
        params.id,
        orgId,
        project.name,
        (currentProject as any).status || "unknown",
        body.status,
      ).catch(() => {}); // Fire-and-forget
    }

    // Auto-create task for METH projects when completed
    if (
      body.status === "completed" &&
      currentProject &&
      (currentProject as any).status !== "completed"
    ) {
      // Auto-create task for METH projects to complete decon report
      if (currentProject.type === "METH") {
        // Check if task already exists
        const existingTask = await prisma.projectTask.findFirst({
          where: {
            projectId: params.id,
            name: "Complete Meth Decontamination Report",
          },
        });

        if (!existingTask) {
          await prisma.projectTask.create({
            data: {
              projectId: params.id,
              name: "Complete Meth Decontamination Report",
              status: "pending",
              sortOrder: 0,
            },
          });
        }
      }
    }

    return NextResponse.json(project);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Verify project belongs to org
    const existingProject = await prisma.project.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingProject) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
