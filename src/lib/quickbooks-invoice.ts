import { qbApiCall, isConnected } from "./quickbooks";
import type { Invoice } from "@/types";
import { logger } from "./logger";

// Find or create a customer in QuickBooks
async function findOrCreateCustomer(invoice: Invoice): Promise<string> {
  // Search by email first, then by name
  const displayName = invoice.customerName || "Unknown Customer";

  // Try to find existing customer by name
  try {
    const query = `SELECT * FROM Customer WHERE DisplayName = '${displayName.replace(/'/g, "\\'")}'`;
    const result = await qbApiCall("GET", `/query?query=${encodeURIComponent(query)}`);
    const customers = result?.QueryResponse?.Customer;
    if (customers && customers.length > 0) {
      return customers[0].Id;
    }
  } catch {
    // Customer not found, create one
  }

  // Create new customer
  const customerData: any = {
    DisplayName: displayName,
    CompanyName: invoice.customerName,
  };

  if (invoice.customerEmail) {
    customerData.PrimaryEmailAddr = { Address: invoice.customerEmail };
  }
  if (invoice.customerPhone) {
    customerData.PrimaryPhone = { FreeFormNumber: invoice.customerPhone };
  }
  if (invoice.customerAddress) {
    customerData.BillAddr = {
      Line1: invoice.customerAddress,
      City: invoice.customerCity || "",
      CountrySubDivisionCode: invoice.customerState || "CO",
      PostalCode: invoice.customerZip || "",
    };
  }

  const created = await qbApiCall("POST", "/customer", customerData);
  return created.Customer.Id;
}

// Map app invoice to QuickBooks invoice format
function mapToQBInvoice(invoice: Invoice, customerId: string): any {
  // Build line items
  const lines: any[] = [];

  if (invoice.lineItems && invoice.lineItems.length > 0) {
    for (const item of invoice.lineItems) {
      lines.push({
        Amount: item.total,
        DetailType: "SalesItemLineDetail",
        Description: item.description || `${item.category} - ${item.unit}`,
        SalesItemLineDetail: {
          Qty: item.quantity,
          UnitPrice: item.unitPrice,
        },
      });
    }
  } else {
    // Fallback: single line item with the invoice total
    lines.push({
      Amount: invoice.subtotal || invoice.total,
      DetailType: "SalesItemLineDetail",
      Description: invoice.scope || "Environmental Services",
      SalesItemLineDetail: {
        Qty: 1,
        UnitPrice: invoice.subtotal || invoice.total,
      },
    });
  }

  const qbInvoice: any = {
    CustomerRef: { value: customerId },
    Line: lines,
    DueDate: invoice.dueDate,
    TxnDate: invoice.issueDate,
    DocNumber: invoice.invoiceNumber,
    BillEmail: invoice.customerEmail
      ? { Address: invoice.customerEmail }
      : undefined,
    EmailStatus: "NeedToSend", // QB will auto-send when we call send endpoint
  };

  // Add customer memo/notes
  if (invoice.notes) {
    qbInvoice.CustomerMemo = { value: invoice.notes };
  }

  // Add billing address
  if (invoice.customerAddress) {
    qbInvoice.BillAddr = {
      Line1: invoice.customerAddress,
      City: invoice.customerCity || "",
      CountrySubDivisionCode: invoice.customerState || "CO",
      PostalCode: invoice.customerZip || "",
    };
  }

  return qbInvoice;
}

// Create invoice in QuickBooks
async function createQBInvoice(
  invoice: Invoice,
  customerId: string
): Promise<{ id: string; syncToken: string }> {
  const qbInvoiceData = mapToQBInvoice(invoice, customerId);
  const result = await qbApiCall("POST", "/invoice", qbInvoiceData);

  return {
    id: result.Invoice.Id,
    syncToken: result.Invoice.SyncToken,
  };
}

// Send the invoice via QuickBooks email
async function sendQBInvoice(invoiceId: string): Promise<void> {
  await qbApiCall(
    "POST",
    `/invoice/${invoiceId}/send`
  );
}

// Main orchestrator: sync invoice to QB and send it
export async function syncAndSendInvoice(
  invoice: Invoice
): Promise<{
  success: boolean;
  qbInvoiceId?: string;
  error?: string;
}> {
  if (!isConnected()) {
    return { success: false, error: "QuickBooks not connected" };
  }

  try {
    // 1. Find or create customer
    const customerId = await findOrCreateCustomer(invoice);

    // 2. Create invoice in QB
    const qbInvoice = await createQBInvoice(invoice, customerId);

    // 3. Send the invoice via QB email
    if (invoice.customerEmail) {
      await sendQBInvoice(qbInvoice.id);
    }

    return {
      success: true,
      qbInvoiceId: qbInvoice.id,
    };
  } catch (err: any) {
    logger.error("QB invoice sync error:", { error: String(err) });
    return {
      success: false,
      error: err.message || "Failed to sync with QuickBooks",
    };
  }
}
