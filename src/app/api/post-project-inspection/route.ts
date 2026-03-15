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
    const projectId = url.searchParams.get("projectId");
    const where: any = orgWhere(orgId, {});
    if (projectId) where.projectId = projectId;
    const items = await prisma.postProjectInspection.findMany({ where, include: { project: true } });
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
    const item = await prisma.postProjectInspection.create({
      data: orgData(orgId, {
        projectId: body.projectId,
        inspectionDate: body.inspectionDate || new Date().toISOString().split("T")[0],
        inspectionTime: body.inspectionTime || "",
        clientName: body.clientName || "",
        clientAddress: body.clientAddress || "",
        projectName: body.projectName || "",
        projectManagerName: body.projectManagerName || "",
        checklistItems: body.checklistItems || {},
        damageNotes: body.damageNotes || "",
        comments: body.comments || "",
        pmSignature: body.pmSignature || "",
        status: body.status || "draft",
        createdBy: body.createdBy || "",
      }),
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
