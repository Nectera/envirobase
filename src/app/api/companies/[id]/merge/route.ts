import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

/**
 * POST /api/companies/[id]/merge
 *
 * Merges a secondary company INTO this (primary) company.
 * All child records from the secondary are reassigned to the primary,
 * then the secondary is deleted.
 *
 * Body: { secondaryId: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { secondaryId } = await req.json();
    if (!secondaryId) {
      return NextResponse.json({ error: "secondaryId is required" }, { status: 400 });
    }
    if (secondaryId === params.id) {
      return NextResponse.json({ error: "Cannot merge a company into itself" }, { status: 400 });
    }

    // Verify both companies exist and belong to org
    const [primary, secondary] = await Promise.all([
      prisma.company.findFirst({ where: orgWhere(orgId, { id: params.id }) }),
      prisma.company.findFirst({ where: orgWhere(orgId, { id: secondaryId }) }),
    ]);
    if (!primary) return NextResponse.json({ error: "Primary company not found" }, { status: 404 });
    if (!secondary) return NextResponse.json({ error: "Secondary company not found" }, { status: 404 });

    // Reassign all child records from secondary → primary
    const moved: Record<string, number> = {};

    // Contacts
    const r1 = await prisma.contact.updateMany({ where: { companyId: secondaryId }, data: { companyId: params.id } });
    moved.contacts = r1.count;

    // Leads
    const r2 = await prisma.lead.updateMany({ where: { companyId: secondaryId }, data: { companyId: params.id } });
    moved.leads = r2.count;

    // Estimates
    const r3 = await prisma.estimate.updateMany({ where: { companyId: secondaryId }, data: { companyId: params.id } });
    moved.estimates = r3.count;

    // Invoices
    const r4 = await prisma.invoice.updateMany({ where: { companyId: secondaryId }, data: { companyId: params.id } });
    moved.invoices = r4.count;

    // Consultation Estimates (companyId field, no FK relation)
    const r5 = await prisma.consultationEstimate.updateMany({ where: { companyId: secondaryId }, data: { companyId: params.id } });
    moved.consultationEstimates = r5.count;

    // Activities (polymorphic parentType/parentId)
    const r6 = await prisma.activity.updateMany({
      where: { parentType: "company", parentId: secondaryId },
      data: { parentId: params.id },
    });
    moved.activities = r6.count;

    // Notes (polymorphic entityType/entityId)
    const r7 = await prisma.note.updateMany({
      where: { entityType: "company", entityId: secondaryId },
      data: { entityId: params.id },
    });
    moved.notes = r7.count;

    // SMS Messages (polymorphic parentType/parentId)
    const r8 = await prisma.smsMessage.updateMany({
      where: { parentType: "company", parentId: secondaryId },
      data: { parentId: params.id },
    });
    moved.smsMessages = r8.count;

    // Tasks (polymorphic linkedEntityType/linkedEntityId)
    const r9 = await prisma.task.updateMany({
      where: { linkedEntityType: "company", linkedEntityId: secondaryId },
      data: { linkedEntityId: params.id },
    });
    moved.tasks = r9.count;

    // Delete the secondary company
    await prisma.company.delete({ where: { id: secondaryId } });

    return NextResponse.json({
      success: true,
      primaryId: params.id,
      secondaryId,
      secondaryName: (secondary as any).name,
      moved,
    });
  } catch (error: any) {
    console.error("Company merge error:", error?.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
