// ─── Conductor (QuickBooks Desktop Cloud Connector) ──────────────
// Conductor.is provides a REST API that bridges QuickBooks Desktop
// to the cloud. This eliminates the need for Intuit's Web Connector
// or any local SOAP service on the customer's machine.
//
// How it works:
// 1. Customer installs a lightweight Conductor agent on their QB Desktop machine
// 2. The agent syncs QB data to Conductor's cloud
// 3. EnviroBase talks to Conductor's REST API (just like QB Online)
//
// Docs: https://docs.conductor.is

import { getIntegrationAuth, setIntegrationAuth, deleteIntegrationAuth } from "./prisma";
import { logger } from "./logger";

const CONDUCTOR_CONFIG = {
  apiKey: process.env.CONDUCTOR_API_KEY || "",
  secretKey: process.env.CONDUCTOR_SECRET_KEY || "",
  baseUrl: "https://api.conductor.is/v1",
};

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${CONDUCTOR_CONFIG.apiKey}`,
    "X-Api-Secret": CONDUCTOR_CONFIG.secretKey,
  };
}

// Check if Conductor credentials are configured
export function isConfigured(): boolean {
  return !!(CONDUCTOR_CONFIG.apiKey && CONDUCTOR_CONFIG.secretKey);
}

// Get the current connection status
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  companyName?: string;
  connectedAt?: string;
  endUserId?: string;
}> {
  try {
    const auth = await getIntegrationAuth("quickbooks-desktop");
    if (!auth) return { connected: false };

    const data = auth.data as any;
    return {
      connected: true,
      companyName: data.companyName || "QuickBooks Desktop",
      connectedAt: data.connectedAt,
      endUserId: data.endUserId,
    };
  } catch (error) {
    logger.error("Error checking Conductor status:", { error: String(error) });
    return { connected: false };
  }
}

// Create an end-user in Conductor and get an auth session
// The customer will use this to link their QB Desktop file
export async function createConnection(): Promise<{
  authSessionUrl?: string;
  error?: string;
}> {
  if (!isConfigured()) {
    return { error: "Conductor API credentials not configured. Add CONDUCTOR_API_KEY and CONDUCTOR_SECRET_KEY to environment variables." };
  }

  try {
    // Step 1: Create an end-user (represents this tenant in Conductor)
    const endUserRes = await fetch(`${CONDUCTOR_CONFIG.baseUrl}/end-users`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        sourceId: `envirobase-${Date.now()}`,
        email: "admin@envirobase.app",
        companyName: "EnviroBase Tenant",
      }),
    });

    if (!endUserRes.ok) {
      const err = await endUserRes.text();
      logger.error("Conductor end-user creation failed:", { error: err });
      return { error: "Failed to initialize Conductor connection. Check API credentials." };
    }

    const endUser = await endUserRes.json();

    // Step 2: Create an auth session for the end-user to connect their QB Desktop
    const sessionRes = await fetch(`${CONDUCTOR_CONFIG.baseUrl}/auth-sessions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        endUserId: endUser.id,
        publishableKey: CONDUCTOR_CONFIG.apiKey,
        linkExpiryMins: 30,
      }),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      logger.error("Conductor auth session creation failed:", { error: err });
      return { error: "Failed to create Conductor auth session." };
    }

    const session = await sessionRes.json();

    // Store the end-user ID so we can use it later
    await setIntegrationAuth("quickbooks-desktop", {
      endUserId: endUser.id,
      connectedAt: new Date().toISOString(),
      companyName: "QuickBooks Desktop (Connecting...)",
      status: "pending",
    });

    return { authSessionUrl: session.authSessionUrl };
  } catch (error) {
    logger.error("Conductor connection error:", { error: String(error) });
    return { error: "Failed to connect to Conductor. Please try again." };
  }
}

// Disconnect the Conductor integration
export async function disconnect(): Promise<void> {
  await deleteIntegrationAuth("quickbooks-desktop");
}

// Sync invoices to QB Desktop via Conductor
export async function syncInvoice(invoiceData: {
  customerName: string;
  lineItems: { description: string; amount: number; quantity: number }[];
  dueDate: string;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await getIntegrationAuth("quickbooks-desktop");
  if (!auth) return { success: false, error: "QuickBooks Desktop not connected" };

  const data = auth.data as any;

  try {
    const res = await fetch(`${CONDUCTOR_CONFIG.baseUrl}/end-users/${data.endUserId}/quickbooks-desktop/invoices`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        customer: { name: invoiceData.customerName },
        lineItems: invoiceData.lineItems.map((li) => ({
          description: li.description,
          amount: li.amount,
          quantity: li.quantity,
        })),
        dueDate: invoiceData.dueDate,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.error("Conductor invoice sync failed:", { error: err });
      return { success: false, error: "Failed to sync invoice to QuickBooks Desktop" };
    }

    return { success: true };
  } catch (error) {
    logger.error("Conductor sync error:", { error: String(error) });
    return { success: false, error: "Connection error during invoice sync" };
  }
}
