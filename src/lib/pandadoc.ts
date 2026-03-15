import { getIntegrationAuth, setIntegrationAuth, deleteIntegrationAuth } from "./prisma";

const API_URL = "https://api.pandadoc.com/public/v1";

// Get the API key from env or DB
async function getApiKey(): Promise<string | null> {
  // Prefer env var, fall back to DB-stored key
  const envKey = process.env.PANDADOC_API_KEY;
  if (envKey) return envKey;
  const pandadocAuth = await getIntegrationAuth("pandadoc");
  return pandadocAuth?.apiKey || null;
}

// Save API key to DB (called from settings)
export async function saveApiKey(apiKey: string): Promise<void> {
  await setIntegrationAuth("pandadoc", {
    apiKey,
    connectedAt: new Date().toISOString(),
  });
}

// Make an authenticated API call to PandaDoc
export async function pdApiCall(
  method: "GET" | "POST" | "DELETE" | "PATCH",
  endpoint: string,
  body?: any
): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("PandaDoc not connected");

  const url = `${API_URL}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `API-Key ${apiKey}`,
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
    throw new Error(`PandaDoc API ${res.status}: ${text}`);
  }

  if (res.status === 204) return {};
  return res.json();
}

// Check if PandaDoc is connected
export async function isConnected(): Promise<boolean> {
  return !!(await getApiKey());
}

// Get connection status
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  connectedAt?: string;
  sandbox?: boolean;
}> {
  const apiKey = await getApiKey();
  if (!apiKey) return { connected: false };

  const pandadocAuth = await getIntegrationAuth("pandadoc");
  return {
    connected: true,
    connectedAt: pandadocAuth?.connectedAt,
    sandbox: apiKey.startsWith("sandbox") || apiKey.includes("sandbox"),
  };
}

// Disconnect PandaDoc
export async function disconnect(): Promise<void> {
  await deleteIntegrationAuth("pandadoc");
}
