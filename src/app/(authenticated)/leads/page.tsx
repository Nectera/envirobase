import { prisma } from "@/lib/prisma";
import LeadsView from "./LeadsView";
import LeadsHeader from "./LeadsHeader";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    include: {
      company: true,
      contact: true,
      estimates: true,
      project: { select: { id: true, name: true, status: true } },
    },
  });

  // Fetch active workers for site visit assignment
  const allWorkers = await prisma.worker.findMany({ where: { status: "active" } });
  const fieldEstimators = (allWorkers as any[]).map((w: any) => ({ id: w.id, name: w.name, position: w.position, office: w.office }));

  return (
    <div>
      <LeadsHeader count={leads.length} />
      <LeadsView leads={leads} fieldEstimators={fieldEstimators} />
    </div>
  );
}
