import { prisma } from "@/lib/prisma";

// ── Colorado City Coordinates (lat, lng) for distance calculations ──
export const COLORADO_COORDS: Record<string, [number, number]> = {
  // Front Range
  "fort collins": [40.5853, -105.0844], "loveland": [40.3978, -105.0750],
  "greeley": [40.4233, -104.7091], "longmont": [40.1672, -105.1019],
  "boulder": [40.0150, -105.2705], "denver": [39.7392, -104.9903],
  "aurora": [39.7294, -104.8319], "lakewood": [39.7047, -105.0814],
  "arvada": [39.8028, -105.0875], "westminster": [39.8367, -105.0372],
  "thornton": [39.8680, -104.9719], "broomfield": [39.9205, -105.0867],
  "brighton": [39.9853, -104.8206], "castle rock": [39.3722, -104.8561],
  "parker": [39.5186, -104.7614], "littleton": [39.6133, -105.0166],
  "golden": [39.7555, -105.2211], "centennial": [39.5681, -104.9686],
  "northglenn": [39.8842, -104.9811], "commerce city": [39.8083, -104.9339],
  "windsor": [40.4775, -104.9014], "firestone": [40.1125, -104.9367],
  "frederick": [40.0992, -104.9372], "erie": [40.0503, -105.0500],
  "johnstown": [40.3369, -104.9122], "berthoud": [40.3083, -105.0811],
  "timnath": [40.5292, -104.9861], "wellington": [40.7036, -105.0089],
  "evans": [40.3764, -104.6922], "milliken": [40.3292, -104.8553],
  "mead": [40.2328, -104.9978], "dacono": [40.0847, -104.9394],
  "estes park": [40.3772, -105.5217], "pueblo": [38.2544, -104.6091],
  "colorado springs": [38.8339, -104.8214], "security-widefield": [38.7478, -104.7147],
  "fountain": [38.6822, -104.6808], "monument": [39.0917, -104.8728],
  "woodland park": [38.9939, -105.0569], "canon city": [38.4411, -105.2422],
  "trinidad": [37.1694, -104.5006], "walsenburg": [37.6244, -104.7803],
  "la junta": [37.9853, -103.5436], "lamar": [38.0872, -102.6208],
  "sterling": [40.6256, -103.2078], "fort morgan": [40.2503, -103.7997],
  // Western Slope
  "grand junction": [39.0639, -108.5506], "fruita": [39.1589, -108.7289],
  "palisade": [39.1108, -108.3511], "montrose": [38.4783, -107.8762],
  "delta": [38.7422, -108.0689], "glenwood springs": [39.5506, -107.3248],
  "rifle": [39.5347, -107.7831], "craig": [40.5153, -107.5464],
  "steamboat springs": [40.4850, -106.8317], "meeker": [40.0375, -107.9131],
  "carbondale": [39.4022, -107.2111], "basalt": [39.3681, -107.0328],
  "aspen": [39.1911, -106.8175], "vail": [39.6403, -106.3742],
  "eagle": [39.6553, -106.8281], "avon": [39.6314, -106.5222],
  "durango": [37.2753, -107.8801], "cortez": [37.3489, -108.5859],
  "pagosa springs": [37.2694, -107.0097], "silverton": [37.8117, -107.6644],
  "telluride": [37.9375, -107.8123], "ouray": [38.0228, -107.6714],
  "gunnison": [38.5458, -106.9253], "crested butte": [38.8697, -106.9878],
  "salida": [38.5347, -106.0003], "buena vista": [38.8422, -106.1311],
  "leadville": [39.2508, -106.2925], "breckenridge": [39.4817, -106.0384],
  "frisco": [39.5747, -106.0975], "dillon": [39.6308, -106.0436],
  "silverthorne": [39.6336, -106.0739], "fairplay": [39.2247, -105.9975],
  "alamosa": [37.4694, -105.8700],
};

export function parseCity(address: string): string | null {
  if (!address) return null;
  const lower = address.toLowerCase().trim();
  for (const city of Object.keys(COLORADO_COORDS)) {
    if (lower.includes(city)) return city;
  }
  const parts = lower.split(",").map(s => s.trim());
  if (parts.length >= 2) {
    const cityPart = parts[parts.length - 2].replace(/\d+/g, "").trim();
    for (const city of Object.keys(COLORADO_COORDS)) {
      if (cityPart.includes(city)) return city;
    }
  }
  return null;
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateDriveTime(miles: number): number {
  const avgSpeed = miles > 50 ? 50 : 40;
  return Math.round((miles * 1.4 / avgSpeed) * 60);
}

export type WorkerRecommendation = {
  workerId: string;
  name: string;
  role: string;
  skillRating: number;
  homeCity: string;
  distance: string;
  distanceMiles: number | null;
  driveTime: string;
  availableDays: string;
  availableDaysNum: number;
  totalDays: number;
  hasMatchingCertType: boolean;
  certifications: string[];
  score: number;
  breakdown: {
    proximity: number;
    availability: number;
    certMatch: number;
    skillMatch: number;
  };
};

export type ScheduleSuggestion = {
  project: {
    name: string;
    address: string;
    type: string;
    city: string;
    difficultyRating: number;
  };
  dateRange: { start: string; end: string; workingDays: number };
  crewSizeNeeded: number;
  recommendations: WorkerRecommendation[];
  topPick: string[];
  summary: string;
};

export async function calculateWorkerScores(
  projectId: string,
  startDate: string,
  endDate?: string,
  crewSize?: number
): Promise<ScheduleSuggestion> {
  // 1. Get project
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { tasks: true, workers: true },
  });
  if (!project) throw new Error("Project not found");

  // 2. Determine crew size and difficulty
  let crew = crewSize || 0;
  let estimatedDays = 0;
  let difficultyRating = 3; // default medium
  {
    const allEstimates = await prisma.consultationEstimate.findMany();
    const linked = allEstimates.find((e: any) =>
      e.projectId === project.id || e.projectNumber === project.projectNumber
    );
    if (linked) {
      if (!crew) crew = (linked as any).crewSize || 0;
      estimatedDays = (linked as any).daysNeeded || 0;
      difficultyRating = (linked as any).difficultyRating || 3;
    }
  }
  if (!crew) crew = project.workers?.length || 3;

  // Adaptive weights: high-difficulty projects boost skill weight
  const isHighDifficulty = difficultyRating >= 4;
  const W_PROXIMITY = isHighDifficulty ? 0.20 : 0.35;
  const W_AVAILABILITY = 0.30;
  const W_CERT = 0.25;
  const W_SKILL = isHighDifficulty ? 0.25 : 0.10;

  // 3. Date range
  let end = endDate;
  if (!end) {
    const days = estimatedDays || (project as any).estimatedDays || 5;
    const endD = new Date(startDate);
    endD.setDate(endD.getDate() + days - 1);
    end = endD.toISOString().split("T")[0];
  }

  // 4. Project location
  const projectCity = parseCity(project.address || "");
  const projectCoords = projectCity ? COLORADO_COORDS[projectCity] : null;

  // 5. Workers
  const workers = await prisma.worker.findMany({ include: { certifications: true } });
  const activeWorkers = workers.filter((w: any) => w.status === "active");

  // 6. Existing schedule
  const scheduleEntries = await prisma.scheduleEntry.findMany();
  const rangeEntries = scheduleEntries.filter((e: any) =>
    e.date >= startDate && e.date <= end
  );
  const workerScheduledDays: Record<string, number> = {};
  for (const entry of rangeEntries) {
    const wid = (entry as any).workerId;
    workerScheduledDays[wid] = (workerScheduledDays[wid] || 0) + 1;
  }

  // Working days count
  let totalDays = 0;
  const d = new Date(startDate);
  const endD = new Date(end);
  while (d <= endD) {
    if (d.getDay() !== 0 && d.getDay() !== 6) totalDays++;
    d.setDate(d.getDate() + 1);
  }

  // 7. Score
  const scored: WorkerRecommendation[] = activeWorkers.map((w: any) => {
    let distance: number | null = null;
    let driveMinutes: number | null = null;
    let distanceScore = 50;

    const workerCity = parseCity(w.homeCity || w.city || w.address || "");
    if (projectCoords && workerCity && COLORADO_COORDS[workerCity]) {
      const [wLat, wLng] = COLORADO_COORDS[workerCity];
      distance = Math.round(haversineDistance(projectCoords[0], projectCoords[1], wLat, wLng));
      driveMinutes = estimateDriveTime(distance);
      distanceScore = Math.max(0, 100 - (distance / 2));
    }

    const scheduledDays = workerScheduledDays[w.id] || 0;
    const availabilityScore = totalDays > 0
      ? Math.round(((totalDays - scheduledDays) / totalDays) * 100)
      : 100;

    // Support multi-type projects (comma-separated)
    const projectTypes = (project.type || "").split(",").map((t: string) => t.trim().toUpperCase()).filter(Boolean);
    const rawTypes = w.types || [];
    const workerTypes: string[] = Array.isArray(rawTypes) ? rawTypes : typeof rawTypes === "string" ? rawTypes.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    const matchCount = projectTypes.filter((pt: string) => workerTypes.some((wt: string) => wt.toUpperCase() === pt)).length;
    const certScore = projectTypes.length > 0 ? Math.round((matchCount / projectTypes.length) * 100) : 30;

    // Skill match score: worker skill vs project difficulty
    const workerSkill = w.skillRating || 3; // default competent
    const baseSkill = (workerSkill / 5) * 100; // 20-100
    let skillMatchScore = baseSkill;
    const gap = workerSkill - difficultyRating;
    if (gap >= 0) {
      // Worker meets or exceeds difficulty — bonus
      skillMatchScore = Math.min(100, baseSkill + gap * 10);
    } else if (gap <= -2) {
      // Worker is significantly underqualified — penalty
      skillMatchScore = Math.max(0, baseSkill + gap * 15);
    }
    // Supervisors get a small role bonus on top
    if (w.position === "Supervisor" || w.role === "supervisor") {
      skillMatchScore = Math.min(100, skillMatchScore + 10);
    }

    const total = Math.round(
      distanceScore * W_PROXIMITY +
      availabilityScore * W_AVAILABILITY +
      certScore * W_CERT +
      skillMatchScore * W_SKILL
    );

    return {
      workerId: w.id,
      name: w.name,
      role: w.role || w.position || "technician",
      skillRating: workerSkill,
      homeCity: w.homeCity || w.city || "Unknown",
      distance: distance !== null ? `${distance} mi` : "Unknown",
      distanceMiles: distance,
      driveTime: driveMinutes !== null ? `~${driveMinutes} min` : "Unknown",
      availableDays: `${totalDays - scheduledDays}/${totalDays}`,
      availableDaysNum: totalDays - scheduledDays,
      totalDays,
      hasMatchingCertType: matchCount > 0,
      certifications: (w.certifications || []).map((c: any) => c.type || c.name).slice(0, 5),
      score: total,
      breakdown: {
        proximity: Math.round(distanceScore),
        availability: availabilityScore,
        certMatch: certScore,
        skillMatch: Math.round(skillMatchScore),
      },
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    project: {
      name: project.name,
      address: project.address,
      type: project.type,
      city: projectCity || "Unknown",
      difficultyRating,
    },
    dateRange: { start: startDate, end: end, workingDays: totalDays },
    crewSizeNeeded: crew,
    recommendations: scored.slice(0, Math.max(crew + 3, 8)),
    topPick: scored.slice(0, crew).map(s => s.name),
    summary: `Top ${crew} recommended: ${scored.slice(0, crew).map(s => `${s.name} (${s.distance}, score: ${s.score})`).join(", ")}`,
  };
}
