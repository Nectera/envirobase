import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

/**
 * POST /api/contacts/[id]/merge
 *
 * Merges a secondary contact INTO this (primary) contact.
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
      return NextResponse.json({ error: "Cannot merge a contact into itself" }, { status: 400 });
    }

    // Verify both contacts exist and belong to org
    const [primary, secondary] = await Promise.all([
      prisma.contact.findFirst({ where: orgWhere(orgId, { id: params.id }) }),
      prisma.contact.findFirst({ where: orgWhere(orgId, { id: secondaryId }) }),
    ]);
    if (!primary) return NextResponse.json({ error: "Primary contact not found" }, { status: 404 });
    if (!secondary) return NextResponse.json({ error: "Secondary contact not found" }, { status: 404 });

    // Reassign all child records from secondary → primary
    const moved: Record<string, number> = {};

    // Leads
    const r1 = await prisma.lead.updateMany({ where: { contactId: secondaryId }, data: { contactId: params.id } });
    moved.leads = r1.count;

    // Estimates
    const r2 = await prisma.estimate.updateMany({ where: { contactId: secondaryId }, data: { contactId: params.id } });
    moved.estimates = r2.count;

    // Invoices
    const r3 = await prisma.invoice.updateMany({ where: { contactId: secondaryId }, data: { contactId: params.id } });
    moved.invoices = r3.count;

    // Consultation Estimates (contactId field)
    const r4 = await prisma.consultationEstimate.updateMany({ where: { contactId: secondaryId }, data: { contactId: params.id } });
    moved.consultationEstimates = r4.count;

    // Activities (polymorphic parentType/parentId)
    const r5 = await prisma.activity.updateMany({
      where: { parentType: "contact", parentId: secondaryId },
      data: { parentId: params.id },
    });
    moved.activities = r5.count;

    // Notes (polymorphic entityType/entityId)
    const r6 = await prisma.note.updateMany({
      where: { entityType: "contact", entityId: secondaryId },
      data: { entityId: params.id },
    });
    moved.notes = r6.count;

    // SMS Messages (polymorphic parentType/parentId)
    const r7 = await prisma.smsMessage.updateMany({
      where: { parentType: "contact", parentId: secondaryId },
      data: { parentId: params.id },
    });
    moved.smsMessages = r7.count;

    // Tasks (polymorphic linkedEntityType/linkedEntityId)
    const r8 = await prisma.task.updateMany({
      where: { linkedEntityType: "contact", linkedEntityId: secondaryId },
      data: { linkedEntityId: params.id },
    });
    moved.tasks = r8.count;

    // Delete the secondary contact
    await prisma.contact.delete({ where: { id: secondaryId } });

    return NextResponse.json({
      success: true,
      primaryId: params.id,
      secondaryId,
      secondaryName: (secondary as any).name || [
        (secondary as any).firstName,
        (secondary as any).lastName,
      ].filter(Boolean).join(" "),
      moved,
    });
  } catch (error: any) {
    console.error("Contact merge error:", error?.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
