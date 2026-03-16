import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_READ_LIMIT, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Default position weights for the weighted headcount formula
const DEFAULT_WEIGHTS: Record<string, number> = {
  "Office Assistant": 0.5,
  "Project Manager": 2.0,
  "Supervisor": 1.5,
  "Technician": 1.0,
};

// Positions excluded from bonus pool (they have commission/incentive plans instead)
const EXCLUDED_POSITIONS = [
  "Field Estimator",
  "Office Manager",
  "Sales Representative",
  "Sales/Marketing",
  "Marketing",
];

const DEFAULT_RATE_PER_HOUR = 17;
const DEFAULT_GOOGLE_REVIEW_BONUS = 50;

/**
 * GET /api/bonus-pool?month=YYYY-MM
 * Returns the bonus pool for a given month (or current month).
 * Accessible to all authenticated users.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id || "anonymous";
    const rl = checkRateLimit(`read:${userId}`, API_READ_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    // Get existing bonus period or calculate one
    let bonusPeriod = await (prisma as any).bonusPeriod.findUnique({
      where: { month },
    });

    // Load bonus config from settings
    const configSetting = await prisma.setting.findUnique({ where: { key: "bonusConfig" } });
    const config = configSetting ? JSON.parse(configSetting.value) : {};
    const positionWeights = config.positionWeights || DEFAULT_WEIGHTS;
    const ratePerHour = config.ratePerHour || DEFAULT_RATE_PER_HOUR;
    const googleReviewBonus = config.googleReviewBonusEach || DEFAULT_GOOGLE_REVIEW_BONUS;

    // Get active workers for headcount (exclude commission-based positions)
    const allWorkers = await prisma.worker.findMany({ where: { ...orgWhere(orgId), status: "active" } });
    const excludedPositions = config.excludedPositions || EXCLUDED_POSITIONS;
    const workers = (allWorkers as any[]).filter(
      (w) => !excludedPositions.some((ep: string) => (w.position || "").toLowerCase() === ep.toLowerCase())
    );
    const headcountByPosition: Record<string, number> = {};
    for (const w of workers) {
      const pos = w.position || "Technician";
      headcountByPosition[pos] = (headcountByPosition[pos] || 0) + 1;
    }

    // Calculate hours saved from projects completed in this month
    const monthStart = `${month}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);

    // Find completed projects (status = "completed") updated in this month range
    const completedProjects = await prisma.project.findMany({
      where: {
        ...orgWhere(orgId),
        status: "completed",
        updatedAt: {
          gte: new Date(monthStart),
          lt: new Date(monthEnd),
        },
      },
      select: { id: true, name: true, projectNumber: true },
    });

    const projectIds = completedProjects.map((p: any) => p.id);

    // Get pre-cost and post-cost estimates for these projects
    let totalEstimatedHours = 0;
    let totalActualHours = 0;
    const projectBreakdowns: any[] = [];

    if (projectIds.length > 0) {
      const estimates = await (prisma as any).consultationEstimate.findMany({
        where: { projectId: { in: projectIds } },
      });

      for (const proj of completedProjects) {
        const preCost = estimates.find(
          (e: any) => e.projectId === proj.id && !e.isPostCost
        );
        const postCost = estimates.find(
          (e: any) => e.projectId === proj.id && e.isPostCost
        );

        const estHours =
          (preCost?.supervisorHours || 0) +
          (preCost?.supervisorOtHours || 0) +
          (preCost?.technicianHours || 0) +
          (preCost?.technicianOtHours || 0);

        const actHours =
          (postCost?.supervisorHours || 0) +
          (postCost?.supervisorOtHours || 0) +
          (postCost?.technicianHours || 0) +
          (postCost?.technicianOtHours || 0);

        const hoursSaved = Math.max(0, estHours - actHours); // no penalty for overages

        totalEstimatedHours += estHours;
        totalActualHours += actHours;

        projectBreakdowns.push({
          projectId: proj.id,
          projectName: (proj as any).projectNumber
            ? `${(proj as any).projectNumber} — ${proj.name}`
            : proj.name,
          estimatedHours: estHours,
          actualHours: actHours,
          hoursSaved,
          bonus: hoursSaved * ratePerHour,
        });
      }
    }

    const totalHoursSaved = Math.max(0, totalEstimatedHours - totalActualHours);
    const poolAmount = totalHoursSaved * ratePerHour;

    // Calculate weighted splits
    const positionSplits = calculateWeightedSplits(
      poolAmount,
      positionWeights,
      headcountByPosition,
      bonusPeriod?.isOverridden ? (bonusPeriod.positionSplits as any) : null
    );

    // If no saved period exists, return calculated data
    const result = {
      month,
      totalEstimatedHours,
      totalActualHours,
      totalHoursSaved,
      ratePerHour,
      poolAmount,
      positionSplits,
      headcountByPosition,
      positionWeights,
      isOverridden: bonusPeriod?.isOverridden || false,
      highPerformerWorkerId: bonusPeriod?.highPerformerWorkerId || null,
      highPerformerName: bonusPeriod?.highPerformerName || null,
      highPerformerAmount: bonusPeriod?.highPerformerAmount || 0,
      googleReviewCount: bonusPeriod?.googleReviewCount || 0,
      googleReviewBonusEach: googleReviewBonus,
      googleReviewTotal: (bonusPeriod?.googleReviewCount || 0) * googleReviewBonus,
      status: bonusPeriod?.status || "draft",
      notes: bonusPeriod?.notes || "",
      projectBreakdowns,
      completedProjectCount: completedProjects.length,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Bonus pool GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/bonus-pool
 * Save/update a bonus period (admin only).
 * Body: { month, googleReviewCount, highPerformerWorkerId, highPerformerName, highPerformerAmount,
 *         overridePositionSplits: { "Office Assistant": 13, "Project Manager": 16, ... }, notes, status }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const user = session.user;
    if (user?.role !== "ADMIN" && user?.role !== "SUPERVISOR" && user?.role !== "OFFICE") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const rl = checkRateLimit(`write:${user.id}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { month } = body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month format (YYYY-MM)" }, { status: 400 });
    }

    // Load config
    const configSetting = await prisma.setting.findUnique({ where: { key: "bonusConfig" } });
    const config = configSetting ? JSON.parse(configSetting.value) : {};
    const positionWeights = config.positionWeights || DEFAULT_WEIGHTS;
    const ratePerHour = config.ratePerHour || DEFAULT_RATE_PER_HOUR;
    const googleReviewBonus = config.googleReviewBonusEach || DEFAULT_GOOGLE_REVIEW_BONUS;

    // Get active workers (exclude commission-based positions)
    const allWorkersPost = await prisma.worker.findMany({ where: { ...orgWhere(orgId), status: "active" } });
    const excludedPositions = config.excludedPositions || EXCLUDED_POSITIONS;
    const workersPost = (allWorkersPost as any[]).filter(
      (w) => !excludedPositions.some((ep: string) => (w.position || "").toLowerCase() === ep.toLowerCase())
    );
    const headcountByPosition: Record<string, number> = {};
    for (const w of workersPost) {
      const pos = w.position || "Technician";
      headcountByPosition[pos] = (headcountByPosition[pos] || 0) + 1;
    }

    // Calculate pool from completed projects
    const monthStart = `${month}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);

    const completedProjects = await prisma.project.findMany({
      where: {
        ...orgWhere(orgId),
        status: "completed",
        updatedAt: { gte: new Date(monthStart), lt: new Date(monthEnd) },
      },
      select: { id: true },
    });

    let totalHoursSaved = 0;
    if (completedProjects.length > 0) {
      const estimates = await (prisma as any).consultationEstimate.findMany({
        where: { projectId: { in: completedProjects.map((p: any) => p.id) } },
      });
      let totalEst = 0, totalAct = 0;
      for (const proj of completedProjects) {
        const pre = estimates.find((e: any) => e.projectId === proj.id && !e.isPostCost);
        const post = estimates.find((e: any) => e.projectId === proj.id && e.isPostCost);
        totalEst += (pre?.supervisorHours || 0) + (pre?.supervisorOtHours || 0) + (pre?.technicianHours || 0) + (pre?.technicianOtHours || 0);
        totalAct += (post?.supervisorHours || 0) + (post?.supervisorOtHours || 0) + (post?.technicianHours || 0) + (post?.technicianOtHours || 0);
      }
      totalHoursSaved = Math.max(0, totalEst - totalAct);
    }

    const poolAmount = totalHoursSaved * ratePerHour;

    // Handle position split overrides
    let positionSplits: any;
    let isOverridden = false;
    if (body.overridePositionSplits && Object.keys(body.overridePositionSplits).length > 0) {
      isOverridden = true;
      positionSplits = {};
      const overrides = body.overridePositionSplits;
      for (const [pos, pct] of Object.entries(overrides)) {
        const p = Number(pct);
        const posPool = poolAmount * (p / 100);
        const hc = headcountByPosition[pos] || 1;
        positionSplits[pos] = { pct: p, pool: Math.round(posPool * 100) / 100, headcount: hc, perPerson: Math.round((posPool / hc) * 100) / 100 };
      }
    } else {
      positionSplits = calculateWeightedSplits(poolAmount, positionWeights, headcountByPosition, null);
    }

    const data: any = {
      month,
      totalHoursSaved,
      ratePerHour,
      poolAmount,
      positionSplits,
      isOverridden,
      status: body.status || "draft",
      notes: body.notes || null,
      googleReviewCount: body.googleReviewCount ?? 0,
      googleReviewBonusEach: googleReviewBonus,
    };

    if (body.highPerformerWorkerId !== undefined) {
      data.highPerformerWorkerId = body.highPerformerWorkerId || null;
      data.highPerformerName = body.highPerformerName || null;
      data.highPerformerAmount = body.highPerformerAmount || 0;
    }

    const bonusPeriod = await (prisma as any).bonusPeriod.upsert({
      where: { month },
      create: data,
      update: data,
    });

    return NextResponse.json(bonusPeriod);
  } catch (error: any) {
    console.error("Bonus pool POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function calculateWeightedSplits(
  poolAmount: number,
  positionWeights: Record<string, number>,
  headcountByPosition: Record<string, number>,
  overrideSplits: Record<string, any> | null
): Record<string, any> {
  // If there are manual overrides, use those percentages but recalculate amounts
  if (overrideSplits) {
    const result: Record<string, any> = {};
    for (const [pos, data] of Object.entries(overrideSplits)) {
      const pct = (data as any).pct || 0;
      const hc = headcountByPosition[pos] || (data as any).headcount || 1;
      const posPool = poolAmount * (pct / 100);
      result[pos] = {
        pct,
        pool: Math.round(posPool * 100) / 100,
        headcount: hc,
        perPerson: Math.round((posPool / hc) * 100) / 100,
      };
    }
    return result;
  }

  // Weighted headcount formula
  // Each position's share = (weight × headcount) / totalWeightedHeadcount × pool
  let totalWeighted = 0;
  const positions: Array<{ pos: string; weight: number; hc: number; weighted: number }> = [];

  for (const [pos, hc] of Object.entries(headcountByPosition)) {
    const weight = positionWeights[pos] || 1.0;
    const weighted = weight * hc;
    totalWeighted += weighted;
    positions.push({ pos, weight, hc, weighted });
  }

  const result: Record<string, any> = {};
  for (const { pos, weight, hc, weighted } of positions) {
    const pct = totalWeighted > 0 ? (weighted / totalWeighted) * 100 : 0;
    const posPool = poolAmount * (pct / 100);
    result[pos] = {
      pct: Math.round(pct * 10) / 10,
      pool: Math.round(posPool * 100) / 100,
      headcount: hc,
      perPerson: Math.round((posPool / hc) * 100) / 100,
      weight,
    };
  }
  return result;
}
