import { prisma } from "@/lib/prisma";
import { DEFAULT_OPS_RATE, DEFAULT_COGS_RATES } from "@/lib/materials";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin, isOffice } from "@/lib/roles";
import ConsultationForm from "../../ConsultationForm";

export const dynamic = "force-dynamic";

export default async function EditConsultationPage({ params }: { params: { id: string } }) {
  const data = await prisma.consultationEstimate.findUnique({
    where: { id: params.id },
  });

  if (!data) return notFound();

  // Post-cost estimates are restricted to Admin/Office Manager
  if ((data as any).isPostCost) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role as string | undefined;
    if (!isAdmin(userRole) && !isOffice(userRole)) {
      redirect("/estimates");
    }
  }

  // Load ops rate from settings
  const opsRateSetting = await prisma.setting.findUnique({ where: { key: "opsPerHourRate" } });
  const settingsOpsRate = opsRateSetting ? parseFloat(opsRateSetting.value) || DEFAULT_OPS_RATE : DEFAULT_OPS_RATE;

  // Load COGS rates from settings
  const cogsKeys = Object.keys(DEFAULT_COGS_RATES).map(k => `cogs_${k}`);
  const cogsSettings = await prisma.setting.findMany({
    where: { key: { in: cogsKeys } },
  });
  const cogsRates: Record<string, number> = {};
  cogsSettings.forEach((s: any) => {
    const key = s.key.replace("cogs_", "");
    cogsRates[key] = parseFloat(s.value);
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Edit Consultation Estimate</h1>
        <p className="text-sm text-slate-500">Editing estimate for {(data as any).customerName}</p>
      </div>
      <ConsultationForm editId={params.id} initialData={data} settingsOpsRate={settingsOpsRate} cogsRates={cogsRates} />
    </div>
  );
}
