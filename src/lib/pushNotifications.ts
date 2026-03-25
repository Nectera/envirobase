import webpush from "web-push";
import { prisma } from "./prisma";
import { logger } from "./logger";

// Configure VAPID keys — set these in your .env
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT_RAW = process.env.VAPID_SUBJECT || "mailto:support@envirobase.app";
// Ensure mailto: prefix — web-push requires a valid URL
const VAPID_SUBJECT = VAPID_SUBJECT_RAW.startsWith("mailto:") ? VAPID_SUBJECT_RAW : `mailto:${VAPID_SUBJECT_RAW}`;

// Lazy init — defer setVapidDetails until first use to avoid build-time crashes
let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    return true;
  } catch (err: any) {
    logger.error("VAPID configuration failed", { error: err.message });
    return false;
  }
}

export type PushCategory = "chat" | "taskAssigned" | "taskDueSoon" | "alert";

// Map push category to NotificationPreference field
const PUSH_PREF_MAP: Record<PushCategory, string> = {
  chat: "pushChat",
  taskAssigned: "pushTaskAssigned",
  taskDueSoon: "pushTaskDueSoon",
  alert: "pushAlerts",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string; // URL to open when notification is clicked
  tag?: string; // Grouping tag (replaces notifications with same tag)
}

/**
 * Check if a user has push enabled for a specific category.
 */
async function isPushEnabled(userId: string, category: PushCategory): Promise<boolean> {
  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!prefs) return false; // Push is opt-in, default off
    if (!prefs.pushEnabled) return false; // Master toggle off
    return !!(prefs as any)[PUSH_PREF_MAP[category]];
  } catch {
    return false;
  }
}

/**
 * Send a push notification to a specific user.
 * Checks preferences, finds all their subscriptions, sends to each.
 * Cleans up expired/invalid subscriptions automatically.
 */
export async function sendPushToUser(
  userId: string,
  category: PushCategory,
  payload: PushPayload,
): Promise<number> {
  if (!ensureVapid()) {
    return 0; // Push not configured
  }

  try {
    const enabled = await isPushEnabled(userId, category);
    if (!enabled) return 0;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return 0;

    let sent = 0;
    const expiredIds: string[] = [];

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/favicon-32x32.png",
      data: {
        url: payload.url || "/",
        tag: payload.tag,
      },
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload,
          { TTL: 60 * 60 } // 1 hour TTL
        );
        sent++;
      } catch (error: any) {
        // 410 Gone or 404 = subscription expired, clean up
        if (error.statusCode === 410 || error.statusCode === 404) {
          expiredIds.push(sub.id);
        } else {
          logger.error("Push send failed", {
            error: error.message,
            statusCode: error.statusCode,
            userId,
            endpoint: sub.endpoint.slice(0, 60),
          });
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: expiredIds } },
      });
      logger.info(`Cleaned up ${expiredIds.length} expired push subscriptions for user ${userId}`);
    }

    return sent;
  } catch (error: any) {
    logger.error("sendPushToUser error", { error: error.message, userId, category });
    return 0;
  }
}

/**
 * Send a push notification to multiple users at once.
 * Useful for broadcast alerts.
 */
export async function sendPushToUsers(
  userIds: string[],
  category: PushCategory,
  payload: PushPayload,
): Promise<number> {
  let totalSent = 0;
  for (const userId of userIds) {
    totalSent += await sendPushToUser(userId, category, payload);
  }
  return totalSent;
}
