import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { LABOR_RATES } from "@/lib/materials";

export const dynamic = "force-dynamic";

/**
 * GET /api/project-performance
 * Returns project performance data modeled after the Revenue Tracker spreadsheet.
 * Pulls from ConsultationEstimate (pre-cost = estimated, post-cost = actual),
 * TimeEntry (actual hours worked), and ProjectWorker (supervisor).
 *
 * Query params:
 *   year - filter by year (default: current year)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const user = session.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year") || "all";
    const isAllYears = yearParam === "all";
    const year = isAllYears ? new Date().getFullYear() : parseInt(yearParam, 10);
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year + 1}-01-01`;

    // Get all projects (completed + in_progress) scoped to org
    const projects = await prisma.project.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["in_progress", "completed"] },
      },
      select: {
        id: true,
        name: true,
        projectNumber: true,
        type: true,
        status: true,
        office: true,
        startDate: true,
        estEndDate: true,
        createdAt: true,
        isSubbedOut: true,
        subContractorId: true,
        workers: {
          select: {
            workerId: true,
            role: true,
            worker: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch subcontractor company names for subbed-out projects
    const subContractorIds = projects
      .filter((p: any) => p.isSubbedOut && p.subContractorId)
      .map((p: any) => p.subContractorId) as string[];
    const subContractorMap: Record<string, string> = {};
    if (subContractorIds.length > 0) {
      const subCompanies = await prisma.company.findMany({
        where: { id: { in: subContractorIds } },
        select: { id: true, name: true },
      });
      for (const sc of subCompanies) {
        subContractorMap[sc.id] = sc.name;
      }
    }

    // Gather all project IDs and project numbers
    const projectIds = projects.map((p: any) => p.id);
    const projectNumbers = projects.map((p: any) => p.projectNumber).filter(Boolean) as string[];

    // Fetch all consultation estimates linked to these projects (include lead for office fallback)
    const estimates = await prisma.consultationEstimate.findMany({
      where: {
        OR: [
          { projectId: { in: projectIds } },
          ...(projectNumbers.length > 0 ? [{ projectNumber: { in: projectNumbers } }] : []),
        ],
      },
      include: {
        lead: { select: { office: true } },
      },
    });

    // Fetch actual hours from time entries (include workerId for role-based labor calc)
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        projectId: { in: projectIds },
        clockOut: { not: null },
      },
      select: {
        projectId: true,
        workerId: true,
        hours: true,
      },
    });

    // Fetch all project workers for role lookup (Supervisor vs Worker)
    const projectWorkers = await prisma.projectWorker.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, workerId: true, role: true },
    });

    // Fetch all workers so we can fall back to Worker.position for supervisor lookup
    const allWorkerIds = new Set<string>();
    for (const pw of projectWorkers) allWorkerIds.add(pw.workerId);
    for (const te of timeEntries) if (te.workerId) allWorkerIds.add(te.workerId);
    const allWorkers = allWorkerIds.size > 0
      ? await prisma.worker.findMany({
          where: { id: { in: Array.from(allWorkerIds) } },
          select: { id: true, name: true, position: true },
        })
      : [];
    const workerById: Record<string, { name: string; position: string | null }> = {};
    for (const w of allWorkers) workerById[w.id] = { name: w.name, position: w.position };

    // Build lookup: projectId → workerId → role
    // Use ProjectWorker.role first, fall back to Worker.position
    const pwRoleMap: Record<string, Record<string, string>> = {};
    for (const pw of projectWorkers) {
      if (!pwRoleMap[pw.projectId]) pwRoleMap[pw.projectId] = {};
      const role = pw.role || workerById[pw.workerId]?.position || "";
      if (role) pwRoleMap[pw.projectId][pw.workerId] = role;
    }

    // Group time entries by project + track supervisor/technician hours
    const hoursMap: Record<string, number> = {};
    const supHoursMap: Record<string, number> = {};
    const techHoursMap: Record<string, number> = {};
    for (const te of timeEntries) {
      if (te.projectId && te.hours) {
        hoursMap[te.projectId] = (hoursMap[te.projectId] || 0) + te.hours;
        const role = pwRoleMap[te.projectId]?.[te.workerId] || "";
        if (role === "Supervisor") {
          supHoursMap[te.projectId] = (supHoursMap[te.projectId] || 0) + te.hours;
        } else {
          techHoursMap[te.projectId] = (techHoursMap[te.projectId] || 0) + te.hours;
        }
      }
    }

    // Group estimates by project — prefer isPrimary for pre-cost
    const estimatesByProject: Record<string, { preCost: any | null; postCost: any | null }> = {};
    for (const est of estimates as any[]) {
      const pid = est.projectId || projects.find((p: any) => p.projectNumber === est.projectNumber)?.id;
      if (!pid) continue;
      if (!estimatesByProject[pid]) estimatesByProject[pid] = { preCost: null, postCost: null };
      if (est.isPostCost) {
        estimatesByProject[pid].postCost = est;
      } else if (est.isPrimary) {
        // Primary always wins
        estimatesByProject[pid].preCost = est;
      } else if (!estimatesByProject[pid].preCost) {
        estimatesByProject[pid].preCost = est;
      }
    }

    // Resolve pre-cost via originalEstimateId if post-cost exists but no pre-cost was matched
    for (const pid of Object.keys(estimatesByProject)) {
      const pair = estimatesByProject[pid];
      if (pair.postCost && !pair.preCost && pair.postCost.originalEstimateId) {
        const original = (estimates as any[]).find((e: any) => e.id === pair.postCost.originalEstimateId);
        if (original) pair.preCost = original;
      }
    }

    // Build performance rows
    const rows: any[] = [];
    for (const project of projects) {
      const estPair = estimatesByProject[project.id];
      if (!estPair?.postCost) continue; // Only show projects with post-cost estimates

      const actual = estPair.postCost;
      const preCost = estPair?.preCost;
      const hasPostCost = true;

      const revenue = Number(actual.customerPrice) || 0;
      let laborCost = Number(actual.laborCost) || 0;
      const opsCost = Number(actual.opsCost) || 0;
      const materialCost = Number(actual.materialCost) || 0;
      const cogsCost = Number(actual.cogsCost) || 0;

      // If stored laborCost is 0 but there are time entries, calculate from hours + rates
      if (laborCost === 0 && (hoursMap[project.id] || 0) > 0) {
        const supRate = LABOR_RATES.supervisor.hourly + LABOR_RATES.supervisor.taxBurden;
        const techRate = LABOR_RATES.technician.hourly + LABOR_RATES.technician.taxBurden;
        const supH = supHoursMap[project.id] || 0;
        const techH = techHoursMap[project.id] || 0;
        laborCost = Math.round((supH * supRate + techH * techRate) * 100) / 100;
      }

      const totalCost = laborCost + opsCost + materialCost + cogsCost;
      const netIncome = revenue - totalCost;
      const grossProfit = revenue - laborCost - materialCost - cogsCost;
      const actualHours = hoursMap[project.id] || 0;

      // Estimated hours from pre-cost (may be null if only post-cost exists)
      const estSupervisorHours = Number(preCost?.supervisorHours) || 0;
      const estTechnicianHours = Number(preCost?.technicianHours) || 0;
      const estimatedHours = estSupervisorHours + estTechnicianHours;

      // Revenue from pre-cost (estimated)
      const estRevenue = Number(preCost?.customerPrice) || 0;
      const estLaborCost = Number(preCost?.laborCost) || 0;
      const estOpsCost = Number(preCost?.opsCost) || 0;
      const estMaterialCost = Number(preCost?.materialCost) || 0;
      const estCogsCost = Number(preCost?.cogsCost) || 0;
      const estTotalCost = estLaborCost + estOpsCost + estMaterialCost + estCogsCost;
      const estNetIncome = estRevenue - estTotalCost;

      // Post-cost data JSON may have bonus and supervisor
      const postData = estPair.postCost?.data as any;
      const manualBonus = postData?.bonusEarned ?? null;
      const supervisorName = postData?.supervisor ?? null;

      // Auto-calculate bonus from hours saved if not manually set
      let bonusEarned = manualBonus;
      if (bonusEarned == null && preCost) {
        const estH = (Number(preCost.supervisorHours) || 0) + (Number(preCost.supervisorOtHours) || 0) +
                     (Number(preCost.technicianHours) || 0) + (Number(preCost.technicianOtHours) || 0);
        const actH = (Number(actual.supervisorHours) || 0) + (Number(actual.supervisorOtHours) || 0) +
                     (Number(actual.technicianHours) || 0) + (Number(actual.technicianOtHours) || 0);
        const saved = Math.max(0, estH - actH);
        if (saved > 0 || estH > 0) {
          bonusEarned = Math.round(saved * 17 * 100) / 100; // $17/hr saved
        }
      }

      // Supervisor: check post-cost data → ProjectWorker role → Worker.position → subcontractor
      const workerSupervisor = project.workers.find((w: any) => w.role === "Supervisor");
      // Also check by Worker.position if ProjectWorker.role is null
      const positionSupervisor = !workerSupervisor
        ? project.workers.find((w: any) => {
            const worker = workerById[w.workerId || ""];
            return worker?.position === "Supervisor";
          })
        : null;
      // Also check time entries — find a worker who clocked in with Supervisor position
      let timeEntrySupervisor: string | null = null;
      if (!workerSupervisor && !positionSupervisor) {
        const projWorkerIds = pwRoleMap[project.id] || {};
        for (const [wId, role] of Object.entries(projWorkerIds)) {
          if (role === "Supervisor" && workerById[wId]) {
            timeEntrySupervisor = workerById[wId].name;
            break;
          }
        }
      }
      const subName = (project as any).isSubbedOut && (project as any).subContractorId
        ? subContractorMap[(project as any).subContractorId] || null
        : null;
      const supervisor = supervisorName
        || (workerSupervisor ? workerSupervisor.worker.name : null)
        || (positionSupervisor ? workerById[(positionSupervisor as any).workerId]?.name || null : null)
        || timeEntrySupervisor
        || (subName ? `Sub: ${subName}` : null);

      // Region mapping from office (fall back to lead's office if project has none)
      const officeValue = project.office || estPair?.preCost?.lead?.office || estPair?.postCost?.lead?.office;
      let region = "Unknown";
      if (officeValue === "greeley") region = "NOCO";
      else if (officeValue === "grand_junction") region = "Western Slope";
      else if (officeValue === "denver") region = "Denver Metro";
      else if (officeValue) region = officeValue;

      // Cash Swing from 15% Net = NetIncome - (Revenue * 0.15) - Bonus
      const cashSwing = netIncome - (revenue * 0.15) - (bonusEarned || 0);

      // Date: use estEndDate, startDate, or createdAt
      const projectDate = project.estEndDate || project.startDate || project.createdAt?.toISOString().split("T")[0];

      rows.push({
        id: project.id,
        date: projectDate,
        project: project.name,
        projectNumber: project.projectNumber,
        type: project.type,
        status: project.status,
        hasPostCost,
        // Financials (actual or best available)
        revenue,
        totalCost,
        netIncome,
        grossProfit,
        laborCost,
        opsCost,
        materialCost,
        cogsCost,
        // Estimated (from pre-cost)
        estRevenue,
        estTotalCost,
        estNetIncome,
        estLaborCost,
        estOpsCost,
        estMaterialCost,
        estCogsCost,
        estimatedHours,
        // Actual hours from time tracking
        hoursWorked: Math.round(actualHours * 100) / 100,
        // Meta
        region,
        bonusEarned,
        supervisor,
        cashSwing: Math.round(cashSwing * 100) / 100,
        netMarginPct: revenue > 0 ? netIncome / revenue : 0,
      });
    }

    // Filter by year based on project date (skip if "all")
    const filteredRows = isAllYears
      ? rows
      : rows.filter((r) => {
          if (!r.date) return true;
          return r.date >= yearStart && r.date < yearEnd;
        });

    // Sort by date descending
    filteredRows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    // Summary totals
    const totals = filteredRows.reduce(
      (acc, r) => {
        acc.revenue += r.revenue;
        acc.totalCost += r.totalCost;
        acc.netIncome += r.netIncome;
        acc.grossProfit += r.grossProfit;
        acc.laborCost += r.laborCost;
        acc.opsCost += r.opsCost;
        acc.materialCost += r.materialCost;
        acc.cogsCost += r.cogsCost;
        acc.hoursWorked += r.hoursWorked;
        acc.bonusEarned += r.bonusEarned || 0;
        acc.cashSwing += r.cashSwing;
        acc.estRevenue += r.estRevenue;
        acc.estTotalCost += r.estTotalCost;
        return acc;
      },
      {
        revenue: 0, totalCost: 0, netIncome: 0, grossProfit: 0,
        laborCost: 0, opsCost: 0, materialCost: 0, cogsCost: 0,
        hoursWorked: 0, bonusEarned: 0, cashSwing: 0,
        estRevenue: 0, estTotalCost: 0,
      }
    );

    // Percentages
    const pcts = totals.revenue > 0
      ? {
          totalCostPct: totals.totalCost / totals.revenue,
          netIncomePct: totals.netIncome / totals.revenue,
          grossProfitPct: totals.grossProfit / totals.revenue,
          laborCostPct: totals.laborCost / totals.revenue,
          opsCostPct: totals.opsCost / totals.revenue,
          materialCostPct: totals.materialCost / totals.revenue,
          cogsCostPct: totals.cogsCost / totals.revenue,
        }
      : {
          totalCostPct: 0, netIncomePct: 0, grossProfitPct: 0,
          laborCostPct: 0, opsCostPct: 0, materialCostPct: 0, cogsCostPct: 0,
        };

    return NextResponse.json({
      year: isAllYears ? "all" : year,
      rows: filteredRows,
      totals,
      percentages: pcts,
      projectCount: filteredRows.length,
      postCostCount: filteredRows.filter((r) => r.hasPostCost).length,
    });
  } catch (error: any) {
    console.error("Project performance GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
