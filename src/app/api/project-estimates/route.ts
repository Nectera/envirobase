import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — list estimates for a project
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const projectId = new URL(req.url).searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const estimates = await prisma.projectEstimate.findMany({
      where: orgWhere(orgId, { projectId }),
      include: {
        lineItems: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { number: "asc" },
    });

    return NextResponse.json(estimates);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create a new estimate (original or supplement)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = (session.user as any)?.role;
    if (!["ADMIN", "PROJECT_MANAGER", "SUPERVISOR"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, type, title, notes } = body;
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    // Auto-number
    const count = await prisma.projectEstimate.count({ where: orgWhere(orgId, { projectId }) });
    const number = count + 1;
    const estType = type || (number === 1 ? "original" : "supplement");
    const defaultTitle = estType === "original"
      ? "Original Estimate"
      : `Supplement #${number - 1}`;

    const estimate = await prisma.projectEstimate.create({
      data: orgData(orgId, {
        projectId,
        number,
        type: estType,
        title: title || defaultTitle,
        notes: notes || null,
      }),
      include: { lineItems: true },
    });

    const userName = (session.user as any)?.name || (session.user as any)?.email || "Unknown";

    // Log activity
    try {
      await prisma.activity.create({
        data: orgData(orgId, {
          parentType: "project",
          parentId: projectId,
          type: "note",
          content: `Created ${estType} estimate: ${estimate.title}`,
          user: userName,
        }),
      });
    } catch {}

    return NextResponse.json(estimate, { status: 201 });
  } catch (error: any) {
    console.error("Project estimate POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
