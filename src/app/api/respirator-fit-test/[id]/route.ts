import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const item = await prisma.respiratorFitTest.findUnique({
      where: orgWhere(orgId, { id: params.id }),
      include: { worker: true, project: true }
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(item);
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

    const body = await req.json();

    const item = await prisma.respiratorFitTest.update({
      where: orgWhere(orgId, { id: params.id }),
      data: {
        workerId: body.workerId,
        projectId: body.projectId || null,
        branchLocation: body.branchLocation || "",
        jobAddress: body.jobAddress || "",
        projectName: body.projectName || "",
        projectSupervisor: body.projectSupervisor || "",
        projectManager: body.projectManager || "",
        projectNumber: body.projectNumber || "",
        supervisor: body.supervisor || "",
        testDate: body.testDate,
        employeeName: body.employeeName || "",
        respiratorType: body.respiratorType || "",
        respiratorSize: body.respiratorSize || "",
        testResults: body.testResults || {},
        comments: body.comments || "",
        performedByName: body.performedByName || "",
        performedByDate: body.performedByDate || "",
        employeeSignDate: body.employeeSignDate || "",
        status: body.status || "draft",
      },
    });

    return NextResponse.json(item);
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

    await prisma.respiratorFitTest.delete({ where: orgWhere(orgId, { id: params.id }) });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
