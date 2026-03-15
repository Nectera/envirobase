import { prisma } from "@/lib/prisma";
import { qbApiCall, isConnected } from "@/lib/quickbooks";
import { logger } from "./logger";

/**
 * Check a single invoice's payment status in QuickBooks and update our DB.
 * If the QB invoice balance is 0 (fully paid), marks our invoice as "paid"
 * and clears the lead's pipelineStage so it auto-derives to "paid".
 */
export async function syncInvoicePaymentStatus(invoice: any): Promise<{
  updated: boolean;
  invoiceId: string;
  newStatus?: string;
  error?: string;
}> {
  if (!invoice.qbInvoiceId) {
    return { updated: false, invoiceId: invoice.id, error: "No QB invoice ID" };
  }

  // Skip if already paid in our system
  if (invoice.status === "paid") {
    return { updated: false, invoiceId: invoice.id };
  }

  try {
    // Query QB for invoice details
    const result = await qbApiCall("GET", `/invoice/${invoice.qbInvoiceId}`);
    const qbInvoice = result?.Invoice;

    if (!qbInvoice) {
      return { updated: false, invoiceId: invoice.id, error: "QB invoice not found" };
    }

    // QB marks Balance as 0 when fully paid
    const balance = qbInvoice.Balance ?? qbInvoice.TotalAmt;
    const isPaid = balance === 0 || balance === "0";

    if (isPaid && invoice.status !== "paid") {
      // Update invoice to paid
      const paidDate = qbInvoice.MetaData?.LastUpdatedTime
        ? new Date(qbInvoice.MetaData.LastUpdatedTime).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "paid",
          paidDate,
          paidAmount: invoice.total,
        },
      });

      // Clear lead pipelineStage so auto-derivation moves it to "paid"
      const isFinalInvoice = invoice.splitType !== "deposit";
      if (isFinalInvoice && invoice.leadId) {
        await prisma.lead.update({
          where: { id: invoice.leadId },
          data: { pipelineStage: null },
        });

        // Log activity
        await prisma.activity.create({
          data: {
            type: "invoice_paid",
            description: `Invoice ${invoice.invoiceNumber} paid via QuickBooks — moved to Paid`,
            entityType: "lead",
            entityId: invoice.leadId,
          },
        });
      }

      return { updated: true, invoiceId: invoice.id, newStatus: "paid" };
    }

    return { updated: false, invoiceId: invoice.id };
  } catch (error: any) {
    logger.error(`Error syncing invoice ${invoice.id}`, { error: String(error) });
    return { updated: false, invoiceId: invoice.id, error: error.message };
  }
}

/**
 * Sync payment status for ALL invoices that have been synced to QuickBooks.
 * Returns a summary of what was updated.
 */
export async function syncAllPayments(): Promise<{
  checked: number;
  updated: number;
  results: Array<{ invoiceId: string; invoiceNumber: string; updated: boolean; newStatus?: string; error?: string }>;
}> {
  if (!isConnected()) {
    return { checked: 0, updated: 0, results: [] };
  }

  // Find all invoices that have been synced to QB and aren't already paid/void
  const allInvoices = await prisma.invoice.findMany();
  const syncedInvoices = (allInvoices as any[]).filter(
    (inv: any) =>
      inv.qbInvoiceId &&
      inv.status !== "paid" &&
      inv.status !== "void"
  );

  const results = [];
  let updated = 0;

  for (const invoice of syncedInvoices) {
    const result = await syncInvoicePaymentStatus(invoice);
    if (result.updated) updated++;
    results.push({
      ...result,
      invoiceNumber: invoice.invoiceNumber,
    });
  }

  return { checked: syncedInvoices.length, updated, results };
}
