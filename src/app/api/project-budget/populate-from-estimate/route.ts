import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/project-budget/populate-from-estimate
 * Auto-populate budget lines from a ConsultationEstimate.
 * Body: { projectId, estimateId }
 */
export async function POST(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const user = session.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, estimateId } = body;

    if (!projectId || !estimateId) {
      return NextResponse.json({ error: "projectId and estimateId are required" }, { status: 400 });
    }

    const estimate = await prisma.consultationEstimate.findUnique({
      where: orgWhere(orgId, { id: estimateId }),
    });

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const linesToCreate: Array<{
      projectId: string;
      category: string;
      description: string;
      budgetAmount: number;
      source: string;
    }> = [];

    // Labor
    if (estimate.laborCost && estimate.laborCost > 0) {
      linesToCreate.push({
        projectId,
        category: "labor",
        description: "Labor (from estimate)",
        budgetAmount: estimate.laborCost,
        source: "estimate",
      });
    }

    // Materials
    if (estimate.materialCost && estimate.materialCost > 0) {
      linesToCreate.push({
        projectId,
        category: "materials",
        description: "Materials (from estimate)",
        budgetAmount: estimate.materialCost,
        source: "estimate",
      });
    }

    // COGS (equipment / disposal)
    if (estimate.cogsCost && estimate.cogsCost > 0) {
      linesToCreate.push({
        projectId,
        category: "equipment",
        description: "COGS / Equipment (from estimate)",
        budgetAmount: estimate.cogsCost,
        source: "estimate",
      });
    }

    // Operating costs
    if (estimate.opsCost && estimate.opsCost > 0) {
      linesToCreate.push({
        projectId,
        category: "other",
        description: "Operating costs (from estimate)",
        budgetAmount: estimate.opsCost,
        source: "estimate",
      });
    }

    // If materials JSON has individual items, also add those if no materialCost total
    if (estimate.materials && !estimate.materialCost) {
      try {
        const mats = typeof estimate.materials === "string"
          ? JSON.parse(estimate.materials as string)
          : estimate.materials;
        if (Array.isArray(mats)) {
          for (const mat of mats) {
            if (mat.total && mat.total > 0) {
              linesToCreate.push({
                projectId,
                category: "materials",
                description: mat.name || mat.description || "Material item",
                budgetAmount: mat.total,
                source: "estimate",
              });
            }
          }
        }
      } catch {
        // ignore malformed JSON
      }
    }

    if (linesToCreate.length === 0) {
      return NextResponse.json({ error: "No budget data found in estimate" }, { status: 400 });
    }

    // Remove existing estimate-sourced lines for this project to avoid dupes
    await prisma.projectBudgetLine.deleteMany({
      where: orgWhere(orgId, { projectId, source: "estimate" }),
    });

    // Create new budget lines
    const created = await prisma.projectBudgetLine.createMany({
      data: linesToCreate.map((l) => orgData(orgId, {
        ...l,
        actualAmount: 0,
      })),
    });

    return NextResponse.json({
      success: true,
      linesCreated: created.count,
      totalBudget: linesToCreate.reduce((sum, l) => sum + l.budgetAmount, 0),
    });
  } catch (error: any) {
    console.error("Budget populate error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
