import { prisma } from "@/lib/prisma";
import EstimatesTable from "./EstimatesTable";
import EstimatesHeader from "./EstimatesHeader";
import ConsultationEstimatesView from "./ConsultationEstimatesView";
import EstimatingTabs from "./EstimatingTabs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin, isOffice } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function EstimatesPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role as string | undefined;
  const canViewPostCost = isAdmin(userRole) || isOffice(userRole);

  const estimates = await prisma.estimate.findMany({
    include: { company: true, lead: true, contact: true },
  });

  const allConsultations = await prisma.consultationEstimate.findMany({
    include: { lead: { select: { id: true, firstName: true, lastName: true } } },
  });
  // Filter out post-cost estimates for non-admin/office users
  const consultations = canViewPostCost
    ? allConsultations
    : (allConsultations as any[]).filter((c: any) => !c.isPostCost);

  // Fetch leads for "Link to Lead" dropdown
  const leads = await prisma.lead.findMany({
    select: { id: true, firstName: true, lastName: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <EstimatingTabs>
        <EstimatesHeader estimateCount={estimates.length} consultationCount={consultations.length} />

        {/* Consultation Estimates */}
        {consultations.length > 0 && (
          <ConsultationEstimatesView consultations={consultations} leads={leads} />
        )}

        {/* Standard Estimates */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Estimates</h2>
          <EstimatesTable estimates={estimates} />
        </div>
      </EstimatingTabs>
    </div>
  );
}
