import { prisma } from "@/lib/prisma";
import TeamView from "./TeamView";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const workers = await prisma.worker.findMany({
    include: {
      certifications: true,
      medicalRecords: { orderBy: { examDate: "desc" }, take: 1 },
      user: { select: { id: true, email: true, role: true } },
    },
    orderBy: { name: "asc" },
  });

  // Fetch positions from settings
  const positionsSetting = await prisma.setting.findUnique({ where: { key: "positions" } });
  const positions: string[] = positionsSetting?.value
    ? JSON.parse(positionsSetting.value)
    : ["Supervisor", "Technician", "Laborer", "Project Manager", "Office Admin", "Office Manager", "Project Coordinator", "Desk Estimator", "Field Estimator"];

  return (
    <div>
      <TeamView workers={workers} positions={positions} />
    </div>
  );
}
