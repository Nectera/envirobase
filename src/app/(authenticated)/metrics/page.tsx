import { prisma } from "@/lib/prisma";
import MetricsView from "./MetricsView";

export default async function MetricsPage() {
  const currentYear = new Date().getFullYear();
  const metrics = await prisma.metric.findMany({
    orderBy: { weekStartDate: "desc" },
  });

  const partnersSetting = await prisma.setting.findUnique({ where: { key: "referralPartners" } });
  const partners: string[] = partnersSetting?.value
    ? JSON.parse(partnersSetting.value)
    : [
        "1-800-Water of Northern Colorado",
        "Action Restoration",
        "Adjuster Leads",
        "All Good Restoration",
        "All Pro Restoration",
        "Allen Service Plumbing",
        "Alliance Construction",
        "Banyan Environmental",
        "Belfor Environmental",
        "CleanPro Restoration",
        "E3C",
        "Phase Con",
        "Quest Environmental",
        "SilverKey",
      ];

  return (
    <div>
      <MetricsView metrics={metrics} partners={partners} currentYear={currentYear} />
    </div>
  );
}
