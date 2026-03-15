import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/project-budget/summary
 * Returns budget vs actuals summary across all active projects.
 * Used by the Budget vs Actuals dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const user = session.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all projects with budget lines
    const projects = await prisma.project.findMany({
      where: orgWhere(orgId, {
        status: { in: ["planning", "assessment", "in_progress", "completed"] },
      }),
      select: {
        id: true,
        name: true,
        projectNumber: true,
        type: true,
        status: true,
        budgetLines: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const projectSummaries = projects
      .filter((p: any) => p.budgetLines.length > 0)
      .map((project: any) => {
        const categoryTotals: Record<string, { budget: number; actual: number }> = {};
        let totalBudget = 0;
        let totalActual = 0;

        for (const line of project.budgetLines) {
          if (!categoryTotals[line.category]) {
            categoryTotals[line.category] = { budget: 0, actual: 0 };
          }
          categoryTotals[line.category].budget += line.budgetAmount;
          categoryTotals[line.category].actual += line.actualAmount;
          totalBudget += line.budgetAmount;
          totalActual += line.actualAmount;
        }

        const variance = totalBudget - totalActual;
        const variancePercent = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;

        return {
          id: project.id,
          name: project.name,
          projectNumber: project.projectNumber,
          type: project.type,
          status: project.status,
          totalBudget,
          totalActual,
          variance,
          variancePercent,
          categoryTotals,
          lineCount: project.budgetLines.length,
        };
      });

    // Global totals
    let grandBudget = 0;
    let grandActual = 0;
    const globalCategories: Record<string, { budget: number; actual: number }> = {};

    for (const ps of projectSummaries) {
      grandBudget += ps.totalBudget;
      grandActual += ps.totalActual;
      for (const [cat, totals] of Object.entries(ps.categoryTotals) as [string, { budget: number; actual: number }][]) {
        if (!globalCategories[cat]) globalCategories[cat] = { budget: 0, actual: 0 };
        globalCategories[cat].budget += totals.budget;
        globalCategories[cat].actual += totals.actual;
      }
    }

    // Projects over budget
    const overBudget = projectSummaries.filter((p: any) => p.variance < 0);
    const underBudget = projectSummaries.filter((p: any) => p.variance >= 0 && p.totalBudget > 0);

    return NextResponse.json({
      projects: projectSummaries,
      grandBudget,
      grandActual,
      grandVariance: grandBudget - grandActual,
      grandVariancePercent: grandBudget > 0 ? ((grandBudget - grandActual) / grandBudget) * 100 : 0,
      globalCategories,
      overBudgetCount: overBudget.length,
      underBudgetCount: underBudget.length,
      totalProjects: projectSummaries.length,
    });
  } catch (error: any) {
    console.error("Budget summary GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
