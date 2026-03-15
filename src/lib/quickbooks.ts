import OAuthClient from "intuit-oauth";
import { getIntegrationAuth, setIntegrationAuth } from "./prisma";
import { logger } from "./logger";

const QB_CONFIG = {
  clientId: process.env.QUICKBOOKS_CLIENT_ID || "",
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || "",
  redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || "http://localhost:3000/api/quickbooks/callback",
  environment: (process.env.QUICKBOOKS_ENVIRONMENT || "sandbox") as "sandbox" | "production",
};

function getBaseUrl(): string {
  return QB_CONFIG.environment === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

// Create a fresh OAuth client instance
export function createOAuthClient(): OAuthClient {
  return new OAuthClient({
    clientId: QB_CONFIG.clientId,
    clientSecret: QB_CONFIG.clientSecret,
    environment: QB_CONFIG.environment === "production" ? "production" : "sandbox",
    redirectUri: QB_CONFIG.redirectUri,
  });
}

// Generate the authorization URL for the user to connect
export function getAuthUri(): string {
  const oauthClient = createOAuthClient();
  return oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: "xtract-qb-connect",
  });
}

// Exchange authorization code for tokens
export async function exchangeCode(
  url: string
): Promise<{ realmId: string; companyName: string }> {
  const oauthClient = createOAuthClient();
  const authResponse = await oauthClient.createToken(url);
  const token = authResponse.getJson();

  // Extract realmId from the callback URL
  const urlObj = new URL(url, "http://localhost:3000");
  const realmId = urlObj.searchParams.get("realmId") || "";

  // Fetch company info
  let companyName = "QuickBooks Company";
  try {
    const companyRes = await oauthClient.makeApiCall({
      url: `${getBaseUrl()}/v3/company/${realmId}/companyinfo/${realmId}`,
      method: "GET",
    });
    const companyData = JSON.parse(companyRes.text());
    companyName = companyData?.CompanyInfo?.CompanyName || companyName;
  } catch {
    // Company name is not critical
  }

  // Store tokens
  await setIntegrationAuth("quickbooks", {
    realmId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    accessTokenExpiresAt: new Date(
      Date.now() + (token.expires_in || 3600) * 1000
    ).toISOString(),
    refreshTokenExpiresAt: new Date(
      Date.now() + (token.x_refresh_token_expires_in || 8726400) * 1000
    ).toISOString(),
    companyName,
    connectedAt: new Date().toISOString(),
  });

  return { realmId, companyName };
}

// Refresh the access token if expired
export async function refreshTokens(): Promise<boolean> {
  const quickbooksAuth = await getIntegrationAuth("quickbooks");
  if (!quickbooksAuth) return false;

  const oauthClient = createOAuthClient();
  oauthClient.setToken({
    access_token: quickbooksAuth.accessToken,
    refresh_token: quickbooksAuth.refreshToken,
    token_type: "bearer",
    expires_in: 3600,
    x_refresh_token_expires_in: 8726400,
    realmId: quickbooksAuth.realmId,
  } as any);

  try {
    const authResponse = await oauthClient.refresh();
    const token = authResponse.getJson();

    await setIntegrationAuth("quickbooks", {
      ...quickbooksAuth,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      accessTokenExpiresAt: new Date(
        Date.now() + (token.expires_in || 3600) * 1000
      ).toISOString(),
      refreshTokenExpiresAt: new Date(
        Date.now() + (token.x_refresh_token_expires_in || 8726400) * 1000
      ).toISOString(),
    });
    return true;
  } catch (err) {
    logger.error("QB token refresh failed:", { error: String(err) });
    return false;
  }
}

// Get a valid access token, refreshing if needed
export async function getValidToken(): Promise<{
  accessToken: string;
  realmId: string;
} | null> {
  const quickbooksAuth = await getIntegrationAuth("quickbooks");
  if (!quickbooksAuth) return null;

  const expiresAt = new Date(quickbooksAuth.accessTokenExpiresAt);
  const now = new Date();

  // Refresh if token expires within 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshed = await refreshTokens();
    if (!refreshed) return null;
    // Re-read auth after refresh
    const freshAuth = await getIntegrationAuth("quickbooks");
    if (!freshAuth) return null;
    return {
      accessToken: freshAuth.accessToken,
      realmId: freshAuth.realmId,
    };
  }

  return {
    accessToken: quickbooksAuth.accessToken,
    realmId: quickbooksAuth.realmId,
  };
}

// Make an authenticated API call to QuickBooks
export async function qbApiCall(
  method: "GET" | "POST",
  endpoint: string,
  body?: any
): Promise<any> {
  const auth = await getValidToken();
  if (!auth) throw new Error("QuickBooks not connected");

  const url = `${getBaseUrl()}/v3/company/${auth.realmId}${endpoint}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QB API ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Upload a file to QuickBooks as an unmatched Attachable (receipt).
 * Uses multipart/form-data with the Attachable endpoint.
 * The receipt appears in QB's "For Review" / attachments area for manual matching.
 */
export async function qbUploadReceipt(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  note?: string
): Promise<any> {
  const auth = await getValidToken();
  if (!auth) throw new Error("QuickBooks not connected");

  const url = `${getBaseUrl()}/v3/company/${auth.realmId}/upload`;

  // QB upload endpoint requires multipart with a JSON metadata part and the file
  const boundary = `----QBReceipt${Date.now()}`;

  const metadataObj = {
    FileName: fileName,
    ContentType: mimeType,
    Note: note || `Receipt uploaded from EnviroBase chat`,
  };
  const metadataJson = JSON.stringify(metadataObj);

  // Build multipart body manually (Node doesn't have FormData with Blob in all environments)
  const parts: Buffer[] = [];
  // JSON metadata part
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file_metadata_0"\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    metadataJson + `\r\n`
  ));
  // File part
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file_content_0"; filename="${fileName}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  ));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QB Upload ${res.status}: ${text}`);
  }

  return res.json();
}

// Check if QuickBooks is connected
export async function isConnected(): Promise<boolean> {
  const quickbooksAuth = await getIntegrationAuth("quickbooks");
  return !!quickbooksAuth?.accessToken;
}

// Get connection status
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  companyName?: string;
  connectedAt?: string;
  refreshTokenExpiring?: boolean;
}> {
  const quickbooksAuth = await getIntegrationAuth("quickbooks");
  if (!quickbooksAuth) return { connected: false };

  const refreshExpires = new Date(quickbooksAuth.refreshTokenExpiresAt);
  const daysUntilExpiry = (refreshExpires.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

  return {
    connected: true,
    companyName: quickbooksAuth.companyName,
    connectedAt: quickbooksAuth.connectedAt,
    refreshTokenExpiring: daysUntilExpiry < 30,
  };
}

// Disconnect QuickBooks
export async function disconnect(): Promise<void> {
  const { deleteIntegrationAuth } = await import("./prisma");
  await deleteIntegrationAuth("quickbooks");
}
