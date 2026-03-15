import { getIntegrationAuth, setIntegrationAuth, deleteIntegrationAuth } from "./prisma";
import { logger } from "./logger";

const RC_CONFIG = {
  clientId: process.env.RINGCENTRAL_CLIENT_ID || "",
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET || "",
  redirectUri: process.env.RINGCENTRAL_REDIRECT_URI || "http://localhost:3000/api/ringcentral/callback",
  serverUrl: process.env.RINGCENTRAL_SERVER_URL || "https://platform.ringcentral.com",
};

function getBasicAuth(): string {
  return Buffer.from(`${RC_CONFIG.clientId}:${RC_CONFIG.clientSecret}`).toString("base64");
}

// Generate OAuth authorization URL
export function getAuthUri(): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: RC_CONFIG.clientId,
    redirect_uri: RC_CONFIG.redirectUri,
    state: "xtract-rc-connect",
  });
  return `${RC_CONFIG.serverUrl}/restapi/oauth/authorize?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCode(code: string): Promise<{ phoneNumber: string; extensionId: string }> {
  const res = await fetch(`${RC_CONFIG.serverUrl}/restapi/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${getBasicAuth()}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: RC_CONFIG.redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const token = await res.json();

  // Fetch user's phone number for caller ID / SMS
  let phoneNumber = "";
  let extensionId = token.owner_id || "~";
  try {
    const phoneRes = await fetch(
      `${RC_CONFIG.serverUrl}/restapi/v1.0/account/~/extension/~/phone-number`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          Accept: "application/json",
        },
      }
    );
    if (phoneRes.ok) {
      const phoneData = await phoneRes.json();
      // Find a number that supports both voice and SMS
      const smsNumber = phoneData.records?.find((r: any) =>
        r.features?.includes("SmsSender") && r.features?.includes("CallerId")
      );
      const anyNumber = phoneData.records?.[0];
      phoneNumber = smsNumber?.phoneNumber || anyNumber?.phoneNumber || "";
    }
  } catch {
    // Phone number fetch is not critical
  }

  // Store tokens in DB
  await setIntegrationAuth("ringcentral", {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    accessTokenExpiresAt: new Date(Date.now() + (token.expires_in || 3600) * 1000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + (token.refresh_token_expires_in || 604800) * 1000).toISOString(),
    phoneNumber,
    extensionId: String(extensionId),
    connectedAt: new Date().toISOString(),
  });

  return { phoneNumber, extensionId: String(extensionId) };
}

// Refresh access token
export async function refreshTokens(): Promise<boolean> {
  const ringcentralAuth = await getIntegrationAuth("ringcentral");
  if (!ringcentralAuth) return false;

  try {
    const res = await fetch(`${RC_CONFIG.serverUrl}/restapi/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${getBasicAuth()}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: ringcentralAuth.refreshToken,
      }).toString(),
    });

    if (!res.ok) {
      logger.error("RC token refresh failed:", { status: res.status });
      return false;
    }

    const token = await res.json();
    await setIntegrationAuth("ringcentral", {
      ...ringcentralAuth,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      accessTokenExpiresAt: new Date(
        Date.now() + (token.expires_in || 3600) * 1000
      ).toISOString(),
      refreshTokenExpiresAt: new Date(
        Date.now() + (token.refresh_token_expires_in || 604800) * 1000
      ).toISOString(),
    });
    return true;
  } catch (err) {
    logger.error("RC token refresh error:", { error: String(err) });
    return false;
  }
}

// Get a valid access token, auto-refreshing if needed
export async function getValidToken(): Promise<{
  accessToken: string;
  phoneNumber: string;
} | null> {
  const ringcentralAuth = await getIntegrationAuth("ringcentral");
  if (!ringcentralAuth) return null;

  const expiresAt = new Date(ringcentralAuth.accessTokenExpiresAt);
  const now = new Date();

  // Refresh if token expires within 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshed = await refreshTokens();
    if (!refreshed) return null;
    const freshAuth = await getIntegrationAuth("ringcentral");
    if (!freshAuth) return null;
    return {
      accessToken: freshAuth.accessToken,
      phoneNumber: freshAuth.phoneNumber,
    };
  }

  return {
    accessToken: ringcentralAuth.accessToken,
    phoneNumber: ringcentralAuth.phoneNumber,
  };
}

// Make an authenticated API call to RingCentral
export async function rcApiCall(
  method: "GET" | "POST" | "DELETE",
  endpoint: string,
  body?: any
): Promise<any> {
  const auth = await getValidToken();
  if (!auth) throw new Error("RingCentral not connected");

  const url = `${RC_CONFIG.serverUrl}/restapi/v1.0${endpoint}`;
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
    throw new Error(`RC API ${res.status}: ${text}`);
  }

  // Some endpoints return 204 No Content
  if (res.status === 204) return {};
  return res.json();
}

// Check if RingCentral is connected
export async function isConnected(): Promise<boolean> {
  const ringcentralAuth = await getIntegrationAuth("ringcentral");
  return !!ringcentralAuth?.accessToken;
}

// Get connection status
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  phoneNumber?: string;
  connectedAt?: string;
  refreshTokenExpiring?: boolean;
}> {
  const ringcentralAuth = await getIntegrationAuth("ringcentral");
  if (!ringcentralAuth) return { connected: false };

  const refreshExpires = new Date(ringcentralAuth.refreshTokenExpiresAt);
  const daysUntilExpiry = (refreshExpires.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

  return {
    connected: true,
    phoneNumber: ringcentralAuth.phoneNumber,
    connectedAt: ringcentralAuth.connectedAt,
    refreshTokenExpiring: daysUntilExpiry < 3,
  };
}

// Disconnect RingCentral
export async function disconnect(): Promise<void> {
  await deleteIntegrationAuth("ringcentral");
}
