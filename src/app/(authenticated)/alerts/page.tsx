import { prisma } from "@/lib/prisma";
import { formatDate, getSeverityColor } from "@/lib/utils";
import AlertList from "./AlertList";
import { getTranslation, type Language } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const language: Language = "en";
  const t = (key: string) => getTranslation(language, key);

  const alerts = await prisma.alert.findMany({
    where: { dismissed: false },
    orderBy: [{ date: "desc" }],
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{t("alerts.pageTitle")}</h1>
        <p className="text-sm text-slate-500">{t("alerts.subtitle")}</p>
      </div>
      <AlertList alerts={alerts} />
    </div>
  );
}
