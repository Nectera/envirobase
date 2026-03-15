import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * QuickBooks Webhook endpoint
 * Receives events from QuickBooks (e.g., invoice payment notifications)
 * QB sends POST with eventNotifications array
 *
 * To set up: In QB Developer Portal → Webhooks, register this URL
 * and subscribe to "Invoice" entity events.
 *
 * NOTE: This endpoint must remain public for QuickBooks to deliver webhooks.
 * Security: Implement signature verification using QB's realmId and auth tokens
 * to ensure requests are genuinely from QuickBooks.
 * TODO: Add HMAC signature verification for QuickBooks webhook security
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // QB sends an array of eventNotifications
    const notifications = payload?.eventNotifications || [];

    for (const notification of notifications) {
      const entities = notification?.dataChangeEvent?.entities || [];

      for (const entity of entities) {
        // We only care about Invoice updates (payments appear as Invoice status changes)
        if (entity.name !== "Invoice") continue;

        const qbInvoiceId = entity.id;
        if (!qbInvoiceId) continue;

        // Find the matching invoice in our DB by qbInvoiceId
        const allInvoices = await prisma.invoice.findMany();
        const invoice = (allInvoices as any[]).find(
          (inv: any) => inv.qbInvoiceId === String(qbInvoiceId)
        );

        if (!invoice) continue;

        // QB webhook doesn't include payment status directly —
        // we need to query QB for the invoice details to check Balance
        // For now, mark for sync. The sync-payments endpoint handles the actual QB query.
        // But if the operation is "Update" and invoice was previously sent, trigger a sync check.
        if (entity.operation === "Update" || entity.operation === "Void") {
          // Queue this invoice for a payment check
          // We'll use a lightweight approach: just call the sync logic inline
          const { syncInvoicePaymentStatus } = await import("@/lib/quickbooks-sync");
          await syncInvoicePaymentStatus(invoice);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // QB expects 200 even on errors to prevent retries
    return NextResponse.json({ success: false });
  }
}

// QB also sends GET requests to verify the webhook endpoint
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
