import { prisma } from "@/lib/prisma";
import {
  COLORADO_COORDS,
  parseCity,
  haversineDistance,
  estimateDriveTime,
} from "./schedule-scoring";

// ── Types ──

export type ProjectSlot = {
  projectId: string;
  projectName: string;
  projectType: string;
  address: string;
  city: string;
  difficultyRating: number;
  crewSize: number;
  daysNeeded: number; // how many of the 5 weekdays this project needs
  assignedWorkers: WeekWorkerAssignment[];
};

export type WeekWorkerAssignment = {
  workerId: string;
  name: string;
  role: string;
  skillRating: number;
  homeCity: string;
  distance: string;
  distanceMiles: number | null;
  driveTime: string;
  hasMatchingCertType: boolean;
  score: number;
  days: string[]; // specific dates assigned (YYYY-MM-DD)
};

export type WeekScheduleResult = {
  weekStart: string;
  weekEnd: string;
  weekDates: string[]; // the 5 weekday dates
  projects: ProjectSlot[];
  unassignedWorkers: {
    workerId: string;
    name: string;
    role: string;
    homeCity: string;
    availableDays: number;
  }[];
  totalWorkers: number;
  totalAssignments: number;
  summary: string;
};

// ── Helper: get weekdays for a Monday start ──
function getWeekDates(mondayStr: string): string[] {
  const dates: string[] = [];
  const d = new Date(mondayStr + "T12:00:00");
  for (let i = 0; i < 5; i++) {
    dates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// ── Main Algorithm ──
export async function calculateWeekSchedule(
  weekStartDate: string, // should be a Monday
  projectOverrides?: { projectId: string; crewSize?: number; daysNeeded?: number }[]
): Promise<WeekScheduleResult> {
  const weekDates = getWeekDates(weekStartDate);
  const weekEnd = weekDates[weekDates.length - 1];

  // 1. Get all active/in-progress projects
  const allProjects = await prisma.project.findMany({
    include: { tasks: true, workers: true },
  });
  const activeProjects = allProjects.filter(
    (p: any) =>
      (p.status === "in_progress" || p.status === "planning" || p.status === "scheduled") &&
      p.status !== "completed" &&
      p.status !== "cancelled"
  );

  // 2. Get consultation estimates for crew sizes
  const allEstimates = await prisma.consultationEstimate.findMany();

  // 3. Build project slots
  const projectSlots: ProjectSlot[] = [];
  for (const proj of activeProjects) {
    // Check if project overlaps with this week
    const projStart = proj.startDate || "";
    const projEnd = (proj as any).estEndDate || (proj as any).estimatedEndDate || "";

    // If project has dates, check overlap; otherwise assume it needs scheduling
    if (projStart && projStart > weekEnd) continue; // hasn't started yet
    if (projEnd && projEnd < weekStartDate) continue; // already ended

    // Get estimate data
    const linked = allEstimates.find(
      (e: any) => e.projectId === proj.id || e.projectNumber === proj.projectNumber
    );

    let crewSize = (linked as any)?.crewSize || proj.workers?.length || 3;
    let daysNeeded = 5; // default full week
    let difficultyRating = (linked as any)?.difficultyRating || 3;

    // Apply overrides
    const override = projectOverrides?.find((o) => o.projectId === proj.id);
    if (override?.crewSize) crewSize = override.crewSize;
    if (override?.daysNeeded) daysNeeded = override.daysNeeded;

    const projectCity = parseCity(proj.address || "");

    projectSlots.push({
      projectId: proj.id,
      projectName: proj.name,
      projectType: proj.type || "",
      address: proj.address || "",
      city: projectCity || "Unknown",
      difficultyRating,
      crewSize,
      daysNeeded: Math.min(daysNeeded, 5),
      assignedWorkers: [],
    });
  }

  if (projectSlots.length === 0) {
    return {
      weekStart: weekStartDate,
      weekEnd,
      weekDates,
      projects: [],
      unassignedWorkers: [],
      totalWorkers: 0,
      totalAssignments: 0,
      summary: "No active projects found for this week.",
    };
  }

  // 4. Get all active workers
  const workers = await prisma.worker.findMany({ include: { certifications: true } });
  const activeWorkers = workers.filter((w: any) => w.status === "active");

  // 5. Get existing schedule for the week (to avoid double-booking)
  const scheduleEntries = await prisma.scheduleEntry.findMany();
  const weekEntries = scheduleEntries.filter(
    (e: any) => e.date >= weekStartDate && e.date <= weekEnd
  );

  // Build map: workerId -> Set of dates already scheduled
  const workerBusyDays: Record<string, Set<string>> = {};
  for (const entry of weekEntries) {
    const wid = (entry as any).workerId;
    if (!workerBusyDays[wid]) workerBusyDays[wid] = new Set();
    workerBusyDays[wid].add((entry as any).date);
  }

  // 6. Score every worker for every project
  type WorkerProjectScore = {
    workerId: string;
    projectId: string;
    score: number;
    distanceMiles: number | null;
    distance: string;
    driveTime: string;
    hasMatchingCertType: boolean;
    availableDays: string[]; // which of the weekDates they're free
  };

  const scorePairs: WorkerProjectScore[] = [];

  for (const slot of projectSlots) {
    const projectCoords = slot.city !== "Unknown" ? COLORADO_COORDS[slot.city] : null;

    const isHighDifficulty = slot.difficultyRating >= 4;
    const W_PROXIMITY = isHighDifficulty ? 0.20 : 0.35;
    const W_AVAILABILITY = 0.30;
    const W_CERT = 0.25;
    const W_SKILL = isHighDifficulty ? 0.25 : 0.10;

    for (const w of activeWorkers) {
      // Distance
      let distanceMiles: number | null = null;
      let driveMinutes: number | null = null;
      let distanceScore = 50;

      const workerCity = parseCity((w as any).homeCity || (w as any).city || (w as any).address || "");
      if (projectCoords && workerCity && COLORADO_COORDS[workerCity]) {
        const [wLat, wLng] = COLORADO_COORDS[workerCity];
        distanceMiles = Math.round(
          haversineDistance(projectCoords[0], projectCoords[1], wLat, wLng)
        );
        driveMinutes = estimateDriveTime(distanceMiles);
        distanceScore = Math.max(0, 100 - distanceMiles / 2);
      }

      // Availability (for this specific week)
      const busyDays = workerBusyDays[w.id] || new Set();
      const availableDays = weekDates.filter((d) => !busyDays.has(d));
      const availabilityScore =
        weekDates.length > 0
          ? Math.round((availableDays.length / weekDates.length) * 100)
          : 100;

      // Cert match
      const projectType = slot.projectType.toUpperCase();
      const rawTypes = (w as any).types || [];
      const workerTypes: string[] = Array.isArray(rawTypes) ? rawTypes : typeof rawTypes === "string" ? rawTypes.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
      const hasMatchingType = workerTypes.some(
        (t: string) => t.toUpperCase() === projectType
      );
      const certScore = hasMatchingType ? 100 : 30;

      // Skill match
      const workerSkill = (w as any).skillRating || 3;
      const baseSkill = (workerSkill / 5) * 100;
      let skillMatchScore = baseSkill;
      const gap = workerSkill - slot.difficultyRating;
      if (gap >= 0) {
        skillMatchScore = Math.min(100, baseSkill + gap * 10);
      } else if (gap <= -2) {
        skillMatchScore = Math.max(0, baseSkill + gap * 15);
      }
      if ((w as any).position === "Supervisor" || (w as any).role === "supervisor") {
        skillMatchScore = Math.min(100, skillMatchScore + 10);
      }

      const total = Math.round(
        distanceScore * W_PROXIMITY +
          availabilityScore * W_AVAILABILITY +
          certScore * W_CERT +
          skillMatchScore * W_SKILL
      );

      scorePairs.push({
        workerId: w.id,
        projectId: slot.projectId,
        score: total,
        distanceMiles,
        distance: distanceMiles !== null ? `${distanceMiles} mi` : "Unknown",
        driveTime: driveMinutes !== null ? `~${driveMinutes} min` : "Unknown",
        hasMatchingCertType: hasMatchingType,
        availableDays,
      });
    }
  }

  // 7. Greedy assignment: assign workers to projects optimally
  // Sort all pairs by score descending — highest-scored combos first
  scorePairs.sort((a, b) => b.score - a.score);

  // Track assignments: workerId -> dates assigned
  const workerAssignedDays: Record<string, Set<string>> = {};
  // Track project crew fills: projectId -> Set of workerIds assigned
  const projectCrewFills: Record<string, Set<string>> = {};

  for (const slot of projectSlots) {
    projectCrewFills[slot.projectId] = new Set();
  }

  // Pass 1: Assign workers to projects greedily
  for (const pair of scorePairs) {
    const slot = projectSlots.find((s) => s.projectId === pair.projectId);
    if (!slot) continue;

    // Is this project already fully crewed?
    if (projectCrewFills[pair.projectId].size >= slot.crewSize) continue;

    // Is this worker already assigned to this project?
    if (projectCrewFills[pair.projectId].has(pair.workerId)) continue;

    // What days can this worker work on this project?
    if (!workerAssignedDays[pair.workerId]) {
      workerAssignedDays[pair.workerId] = new Set(
        workerBusyDays[pair.workerId] || []
      );
    }

    const daysForProject = weekDates.slice(0, slot.daysNeeded);
    const availableForThis = daysForProject.filter(
      (d) => !workerAssignedDays[pair.workerId].has(d)
    );

    // Need at least 1 day available
    if (availableForThis.length === 0) continue;

    // Assign this worker to this project
    for (const day of availableForThis) {
      workerAssignedDays[pair.workerId].add(day);
    }

    projectCrewFills[pair.projectId].add(pair.workerId);

    const worker = activeWorkers.find((w: any) => w.id === pair.workerId)!;
    slot.assignedWorkers.push({
      workerId: pair.workerId,
      name: (worker as any).name,
      role: (worker as any).role || (worker as any).position || "technician",
      skillRating: (worker as any).skillRating || 3,
      homeCity: (worker as any).homeCity || (worker as any).city || "Unknown",
      distance: pair.distance,
      distanceMiles: pair.distanceMiles,
      driveTime: pair.driveTime,
      hasMatchingCertType: pair.hasMatchingCertType,
      score: pair.score,
      days: availableForThis,
    });
  }

  // 8. Build unassigned workers list
  const assignedWorkerIds = new Set<string>();
  for (const slot of projectSlots) {
    for (const aw of slot.assignedWorkers) {
      assignedWorkerIds.add(aw.workerId);
    }
  }
  const unassignedWorkers = activeWorkers
    .filter((w: any) => !assignedWorkerIds.has(w.id))
    .map((w: any) => {
      const busyDays = workerBusyDays[w.id] || new Set();
      return {
        workerId: w.id,
        name: w.name,
        role: w.role || w.position || "technician",
        homeCity: w.homeCity || w.city || "Unknown",
        availableDays: weekDates.filter((d) => !busyDays.has(d)).length,
      };
    })
    .filter((w: any) => w.availableDays > 0);

  // 9. Summary
  let totalAssignments = 0;
  for (const slot of projectSlots) {
    totalAssignments += slot.assignedWorkers.length;
  }

  const projectSummaries = projectSlots
    .filter((s) => s.assignedWorkers.length > 0)
    .map(
      (s) =>
        `${s.projectName}: ${s.assignedWorkers.length}/${s.crewSize} crew`
    );

  return {
    weekStart: weekStartDate,
    weekEnd,
    weekDates,
    projects: projectSlots,
    unassignedWorkers,
    totalWorkers: activeWorkers.length,
    totalAssignments,
    summary: projectSummaries.length
      ? `Scheduled ${totalAssignments} workers across ${projectSummaries.length} projects. ${projectSummaries.join("; ")}`
      : "No workers could be assigned this week.",
  };
}
