import { getIntegrationAuth, setIntegrationAuth, deleteIntegrationAuth } from "./prisma";
import { logger } from "./logger";

const GUSTO_CONFIG = {
  clientId: process.env.GUSTO_CLIENT_ID || "",
  clientSecret: process.env.GUSTO_CLIENT_SECRET || "",
  redirectUri: process.env.GUSTO_REDIRECT_URI || "http://localhost:3000/api/gusto/callback",
  environment: (process.env.GUSTO_ENVIRONMENT || "demo") as "demo" | "production",
};

function getBaseUrl(): string {
  return GUSTO_CONFIG.environment === "production"
    ? "https://api.gusto.com"
    : "https://api.gusto-demo.com";
}

// The auth URL is always on the main domain
function getAuthBaseUrl(): string {
  return "https://api.gusto-demo.com";
}

// Generate the OAuth authorization URL
export function getAuthUri(): string {
  const params = new URLSearchParams({
    client_id: GUSTO_CONFIG.clientId,
    redirect_uri: GUSTO_CONFIG.redirectUri,
    response_type: "code",
  });
  return `${getAuthBaseUrl()}/oauth/authorize?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCode(code: string): Promise<{ companyId: string; companyName: string }> {
  const tokenRes = await fetch(`${getAuthBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: GUSTO_CONFIG.clientId,
      client_secret: GUSTO_CONFIG.clientSecret,
      redirect_uri: GUSTO_CONFIG.redirectUri,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Gusto token exchange failed: ${tokenRes.status} ${text}`);
  }

  const token = await tokenRes.json();

  // Fetch current user to get company info
  let companyId = "";
  let companyName = "Gusto Company";

  try {
    const meRes = await fetch(`${getBaseUrl()}/v1/me`, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: "application/json",
      },
    });
    if (meRes.ok) {
      const me = await meRes.json();
      // The /v1/me endpoint returns roles with company info
      if (me.roles) {
        const payrollAdmin = me.roles.find((r: any) => r.type === "Role::PayrollAdmin");
        if (payrollAdmin) {
          companyId = payrollAdmin.companies?.[0]?.uuid || payrollAdmin.companies?.[0]?.id || "";
          companyName = payrollAdmin.companies?.[0]?.name || companyName;
        }
        // Fallback to any role with companies
        if (!companyId) {
          for (const role of me.roles) {
            if (role.companies && role.companies.length > 0) {
              companyId = role.companies[0].uuid || role.companies[0].id || "";
              companyName = role.companies[0].name || companyName;
              break;
            }
          }
        }
      }
    }
  } catch {
    // Company info not critical for connection
  }

  // Store tokens
  await setIntegrationAuth("gusto", {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    accessTokenExpiresAt: new Date(
      Date.now() + (token.expires_in || 7200) * 1000
    ).toISOString(),
    companyId,
    companyName,
    connectedAt: new Date().toISOString(),
  });

  return { companyId, companyName };
}

// Refresh the access token
export async function refreshTokens(): Promise<boolean> {
  const gustoAuth = await getIntegrationAuth("gusto");
  if (!gustoAuth) return false;

  try {
    const res = await fetch(`${getAuthBaseUrl()}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: GUSTO_CONFIG.clientId,
        client_secret: GUSTO_CONFIG.clientSecret,
        redirect_uri: GUSTO_CONFIG.redirectUri,
        refresh_token: gustoAuth.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      logger.error("Gusto token refresh failed:", { status: res.status });
      return false;
    }

    const token = await res.json();
    await setIntegrationAuth("gusto", {
      ...gustoAuth,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      accessTokenExpiresAt: new Date(
        Date.now() + (token.expires_in || 7200) * 1000
      ).toISOString(),
    });
    return true;
  } catch (err) {
    logger.error("Gusto token refresh error:", { error: String(err) });
    return false;
  }
}

// Get a valid access token, refreshing if needed
export async function getValidToken(): Promise<{ accessToken: string; companyId: string } | null> {
  const gustoAuth = await getIntegrationAuth("gusto");
  if (!gustoAuth) return null;

  const expiresAt = new Date(gustoAuth.accessTokenExpiresAt);
  const now = new Date();

  // Refresh if token expires within 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshed = await refreshTokens();
    if (!refreshed) return null;
    const freshAuth = await getIntegrationAuth("gusto");
    if (!freshAuth) return null;
    return {
      accessToken: freshAuth.accessToken,
      companyId: freshAuth.companyId,
    };
  }

  return {
    accessToken: gustoAuth.accessToken,
    companyId: gustoAuth.companyId,
  };
}

// Make an authenticated API call to Gusto
export async function gustoApiCall(
  method: "GET" | "POST" | "PUT" | "DELETE",
  endpoint: string,
  body?: any
): Promise<any> {
  const auth = await getValidToken();
  if (!auth) throw new Error("Gusto not connected");

  const url = `${getBaseUrl()}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gusto API ${res.status}: ${text}`);
  }

  if (res.status === 204) return {};
  return res.json();
}

// Check if Gusto is connected
export async function isConnected(): Promise<boolean> {
  const gustoAuth = await getIntegrationAuth("gusto");
  return !!gustoAuth?.accessToken;
}

// Get connection status
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  companyName?: string;
  companyId?: string;
  connectedAt?: string;
}> {
  const gustoAuth = await getIntegrationAuth("gusto");
  if (!gustoAuth) return { connected: false };

  return {
    connected: true,
    companyName: gustoAuth.companyName,
    companyId: gustoAuth.companyId,
    connectedAt: gustoAuth.connectedAt,
  };
}

// Disconnect Gusto
export async function disconnect(): Promise<void> {
  await deleteIntegrationAuth("gusto");
}
