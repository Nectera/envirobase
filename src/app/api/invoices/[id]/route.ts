import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { updateInvoiceSchema, validateBody } from "@/lib/validations";
import { isConnected } from "@/lib/quickbooks";
import { syncAndSendInvoice } from "@/lib/quickbooks-invoice";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const item = await prisma.invoice.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: { consultationEstimate: true, company: true, contact: true, lead: true },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const v = validateBody(updateInvoiceSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    // Get the full invoice to check its type and linked lead
    const fullInvoice = await prisma.invoice.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!fullInvoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isFinalInvoice = (fullInvoice as any).splitType !== "deposit";

    // If status is changing to "sent" and QB is connected, sync to QuickBooks
    let qbResult: { success: boolean; qbInvoiceId?: string; error?: string } | null = null;

    if (body.status === "sent" && (await isConnected())) {
      qbResult = await syncAndSendInvoice(fullInvoice as any);
      if (qbResult.success) {
        body.qbInvoiceId = qbResult.qbInvoiceId;
        body.qbSyncStatus = "synced";
        body.qbSyncError = null;
      } else {
        body.qbSyncStatus = "failed";
        body.qbSyncError = qbResult.error || "Unknown error";
      }
    }

    // When a final invoice (not deposit) is sent → clear pipelineStage so it auto-derives to "invoiced"
    // When a final invoice is marked paid → clear pipelineStage so it auto-derives to "paid"
    if (isFinalInvoice && (body.status === "sent" || body.status === "paid")) {
      const leadId = (fullInvoice as any).leadId;
      if (leadId) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { pipelineStage: null },
        });

        // Log activity
        await prisma.activity.create({
          data: {
            type: body.status === "sent" ? "invoice_sent" : "invoice_paid",
            description:
              body.status === "sent"
                ? `Invoice ${(fullInvoice as any).invoiceNumber} sent — moved to Invoiced`
                : `Invoice ${(fullInvoice as any).invoiceNumber} marked paid — moved to Paid`,
            entityType: "lead",
            entityId: leadId,
          },
        });
      }
    }

    const item = await prisma.invoice.update({
      where: { id: params.id },
      data: body,
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ...item, qbResult });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Verify invoice belongs to org
    const existingInvoice = await prisma.invoice.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingInvoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.invoice.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
