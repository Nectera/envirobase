/**
 * Google Calendar integration — one-way push from app → Google Calendar.
 * Multi-tenant: all queries scoped by organizationId.
 *
 * Flow:
 * 1. User clicks "Connect Google Calendar" → redirected to Google OAuth consent
 * 2. Google redirects back with auth code → exchanged for access + refresh tokens
 * 3. Tokens stored in GoogleCalendarSync table per user (with organizationId)
 * 4. When calendar events are created/updated/deleted, we push to Google Calendar
 *    for all connected users in the same organization.
 *
 * Requires env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_CALENDAR_REDIRECT_URI  (e.g. https://yourapp.com/api/google-calendar/callback)
 */

import { prisma } from "./prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// ─── OAuth helpers ──────────────────────────────────────────────

export function getGoogleAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CALENDAR_REDIRECT_URI env vars");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_CALENDAR_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

async function refreshAccessToken(syncRecord: {
  id: string;
  refreshToken: string;
}): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: syncRecord.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await res.json();
  const newExpiry = new Date(Date.now() + data.expires_in * 1000);

  await prisma.googleCalendarSync.update({
    where: { id: syncRecord.id },
    data: {
      accessToken: data.access_token,
      tokenExpiry: newExpiry,
    },
  });

  return data.access_token;
}

export async function getGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to get Google user info");
  const data = await res.json();
  return data.email;
}

// ─── Token management ───────────────────────────────────────────

async function getValidToken(userId: string): Promise<{ token: string; sync: any } | null> {
  const sync = await prisma.googleCalendarSync.findUnique({ where: { userId } });
  if (!sync || !sync.enabled) return null;

  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (sync.tokenExpiry < fiveMinFromNow) {
    try {
      const newToken = await refreshAccessToken(sync);
      return { token: newToken, sync };
    } catch {
      await prisma.googleCalendarSync.update({
        where: { id: sync.id },
        data: { enabled: false },
      });
      return null;
    }
  }

  return { token: sync.accessToken, sync };
}

// ─── Calendar API calls ─────────────────────────────────────────

interface CalendarEventData {
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  color?: string | null;
}

function buildGoogleEvent(data: CalendarEventData) {
  const event: any = {
    summary: data.title,
    description: data.description || undefined,
  };

  if (data.allDay !== false || (!data.startTime && !data.endTime)) {
    event.start = { date: data.startDate };
    const endDate = new Date(data.endDate + "T12:00:00");
    endDate.setDate(endDate.getDate() + 1);
    event.end = { date: endDate.toISOString().split("T")[0] };
  } else {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver";
    event.start = {
      dateTime: `${data.startDate}T${data.startTime || "09:00"}:00`,
      timeZone: tz,
    };
    event.end = {
      dateTime: `${data.endDate}T${data.endTime || "17:00"}:00`,
      timeZone: tz,
    };
  }

  return event;
}

export async function pushEventToGoogle(
  userId: string,
  data: CalendarEventData
): Promise<string | null> {
  const auth = await getValidToken(userId);
  if (!auth) return null;

  const googleEvent = buildGoogleEvent(data);
  const calendarId = auth.sync.calendarId || "primary";

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googleEvent),
    }
  );

  if (!res.ok) {
    console.error("Google Calendar push failed:", await res.text());
    return null;
  }

  const created = await res.json();
  return created.id;
}

export async function updateGoogleEvent(
  userId: string,
  googleEventId: string,
  data: CalendarEventData
): Promise<boolean> {
  const auth = await getValidToken(userId);
  if (!auth) return false;

  const googleEvent = buildGoogleEvent(data);
  const calendarId = auth.sync.calendarId || "primary";

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googleEvent),
    }
  );

  if (!res.ok) {
    console.error("Google Calendar update failed:", await res.text());
    return false;
  }

  return true;
}

export async function deleteGoogleEvent(
  userId: string,
  googleEventId: string
): Promise<boolean> {
  const auth = await getValidToken(userId);
  if (!auth) return false;

  const calendarId = auth.sync.calendarId || "primary";

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.token}` },
    }
  );

  return res.status === 204 || res.status === 410;
}

/**
 * Push a calendar event to ALL connected users within an organization.
 * Multi-tenant: only pushes to users in the specified orgId.
 */
export async function pushEventToAllConnected(
  orgId: string,
  data: CalendarEventData
): Promise<Record<string, string>> {
  const syncRecords = await prisma.googleCalendarSync.findMany({
    where: { enabled: true, organizationId: orgId },
  });

  const results: Record<string, string> = {};

  await Promise.allSettled(
    syncRecords.map(async (sync: any) => {
      const googleId = await pushEventToGoogle(sync.userId, data);
      if (googleId) results[sync.userId] = googleId;
    })
  );

  return results;
}

/**
 * Delete a Google Calendar event from ALL connected users within an organization.
 */
export async function deleteEventFromAllConnected(
  orgId: string,
  googleEventId: string
): Promise<void> {
  const syncRecords = await prisma.googleCalendarSync.findMany({
    where: { enabled: true, organizationId: orgId },
  });

  await Promise.allSettled(
    syncRecords.map((sync: any) => deleteGoogleEvent(sync.userId, googleEventId))
  );
}
