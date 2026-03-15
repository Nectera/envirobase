import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const url = new URL(req.url);
    const workerId = url.searchParams.get("workerId");
    const projectId = url.searchParams.get("projectId");

    const where: any = {};
    if (workerId) where.workerId = workerId;
    if (projectId) where.projectId = projectId;

    const items = await prisma.respiratorFitTest.findMany({
      where: orgWhere(orgId, where),
      include: { worker: true, project: true }
    });

    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    // Calculate expiresDate = testDate + 1 year
    const testDate = new Date(body.testDate);
    const expiresDate = new Date(testDate);
    expiresDate.setFullYear(expiresDate.getFullYear() + 1);
    const expiresDateStr = expiresDate.toISOString().split("T")[0];

    const item = await prisma.respiratorFitTest.create({
      data: orgData(orgId, {
        workerId: body.workerId,
        projectId: body.projectId || null,
        branchLocation: body.branchLocation || "",
        jobAddress: body.jobAddress || "",
        projectName: body.projectName || "",
        projectSupervisor: body.projectSupervisor || "",
        projectManager: body.projectManager || "",
        projectNumber: body.projectNumber || "",
        supervisor: body.supervisor || "",
        testDate: body.testDate || new Date().toISOString().split("T")[0],
        employeeName: body.employeeName || "",
        respiratorType: body.respiratorType || "",
        respiratorSize: body.respiratorSize || "",
        testResults: body.testResults || {},
        comments: body.comments || "",
        performedByName: body.performedByName || "",
        performedByDate: body.performedByDate || new Date().toISOString().split("T")[0],
        employeeSignDate: body.employeeSignDate || "",
        expiresDate: expiresDateStr,
        status: body.status || "draft",
        createdBy: body.createdBy || "",
      }),
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
