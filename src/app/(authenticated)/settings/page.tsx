import { prisma } from "@/lib/prisma";
import SettingsView from "./SettingsView";
import { DEFAULT_COGS_RATES } from "@/lib/materials";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const positionsSetting = await prisma.setting.findUnique({ where: { key: "positions" } });
  const positions: string[] = positionsSetting?.value
    ? JSON.parse(positionsSetting.value)
    : ["Supervisor", "Technician", "Laborer", "Project Manager", "Office Admin", "Office Manager", "Project Coordinator", "Desk Estimator", "Field Estimator"];

  const rolesSetting = await prisma.setting.findUnique({ where: { key: "roles" } });
  const roles: string[] = rolesSetting?.value
    ? JSON.parse(rolesSetting.value)
    : ["ADMIN", "PROJECT_MANAGER", "SUPERVISOR", "TECHNICIAN", "OFFICE"];

  const certTypesSetting = await prisma.setting.findUnique({ where: { key: "certificationTypes" } });
  const certTypes: string[] = certTypesSetting?.value
    ? JSON.parse(certTypesSetting.value)
    : ["ASBESTOS", "LEAD", "METH", "MOLD", "SELECT_DEMO", "REBUILD"];

  // Load COGS rates from settings
  const cogsKeys = Object.keys(DEFAULT_COGS_RATES).map(k => `cogs_${k}`);
  const cogsSettings = await prisma.setting.findMany({
    where: { key: { in: cogsKeys } },
  });
  const cogsRatesFromDb: Record<string, number> = {};
  cogsSettings.forEach((s: any) => {
    const key = s.key.replace("cogs_", "");
    cogsRatesFromDb[key] = parseFloat(s.value);
  });
  const initialCogsRates = { ...DEFAULT_COGS_RATES, ...cogsRatesFromDb };

  return <SettingsView initialPositions={positions} initialRoles={roles} initialCertTypes={certTypes} initialCogsRates={initialCogsRates} />;
}
