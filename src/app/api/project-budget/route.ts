import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = [
  "labor",
  "materials",
  "equipment",
  "subcontractor",
  "disposal",
  "permits",
  "clearance",
  "other",
];

/**
 * GET /api/project-budget?projectId=xxx
 * List all budget lines for a project
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const getUser = session.user as any;
    if (getUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const lines = await prisma.projectBudgetLine.findMany({
      where: orgWhere(orgId, { projectId }),
      orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    });

    // Calculate totals by category
    const totals: Record<string, { budget: number; actual: number }> = {};
    let totalBudget = 0;
    let totalActual = 0;

    for (const line of lines) {
      if (!totals[line.category]) {
        totals[line.category] = { budget: 0, actual: 0 };
      }
      totals[line.category].budget += line.budgetAmount;
      totals[line.category].actual += line.actualAmount;
      totalBudget += line.budgetAmount;
      totalActual += line.actualAmount;
    }

    return NextResponse.json({
      lines,
      totals,
      totalBudget,
      totalActual,
      variance: totalBudget - totalActual,
      variancePercent: totalBudget > 0 ? ((totalBudget - totalActual) / totalBudget) * 100 : 0,
    });
  } catch (error: any) {
    console.error("Budget GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/project-budget
 * Create a new budget line
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const user = session.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, category, description, budgetAmount, actualAmount, notes } = body;

    if (!projectId || !category || !description) {
      return NextResponse.json({ error: "projectId, category, and description are required" }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
    }

    const line = await prisma.projectBudgetLine.create({
      data: orgData(orgId, {
        projectId,
        category,
        description,
        budgetAmount: parseFloat(budgetAmount) || 0,
        actualAmount: parseFloat(actualAmount) || 0,
        notes: notes || null,
        source: "manual",
      }),
    });

    return NextResponse.json(line, { status: 201 });
  } catch (error: any) {
    console.error("Budget POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
