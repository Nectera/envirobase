import { prisma } from "./prisma";
import { sendHtmlEmail, escapeHtml } from "./email";
import { logger } from "./logger";
import { COMPANY_SHORT, COMPANY_NAME, COMPANY_LOCATION, BRAND_COLOR, APP_NAME } from "./branding";

// Notification type → NotificationPreference field name mapping
type NotificationType =
  | "scheduleAssigned"
  | "scheduleChanged"
  | "taskAssigned"
  | "taskDueSoon"
  | "taskCompleted"
  | "certExpiring"
  | "incidentReported"
  | "fieldReportSubmitted"
  | "inventoryReviewCompleted";

/**
 * Build branded notification email HTML.
 * Reuses the same Xtract Environmental branding as other emails.
 */
function buildNotificationHtml(subject: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A2D;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${COMPANY_SHORT}</h1>
          <p style="margin:4px 0 0;color:${BRAND_COLOR};font-size:13px;">Notification</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;font-weight:600;">${escapeHtml(subject)}</h2>
          ${bodyContent}
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
            ${COMPANY_NAME} &bull; ${COMPANY_LOCATION}<br>
            You can manage notification preferences in Settings &rarr; Notifications.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Check if a user has a specific notification type enabled.
 * Returns true by default if no preference record exists (opt-out model).
 */
async function isNotificationEnabled(userId: string, type: NotificationType): Promise<boolean> {
  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // No preferences saved yet → use defaults (all true except taskCompleted)
    if (!prefs) {
      return type !== "taskCompleted";
    }

    return !!(prefs as any)[type];
  } catch {
    return true; // Default to sending on error
  }
}

/**
 * Send a notification email to a specific user (by userId).
 * Checks user's notification preferences before sending.
 * Returns true if email was sent, false if skipped or failed.
 */
export async function sendNotificationToUser(
  userId: string,
  type: NotificationType,
  subject: string,
  bodyContent: string,
): Promise<boolean> {
  try {
    // Check preference
    const enabled = await isNotificationEnabled(userId, type);
    if (!enabled) {
      logger.info(`Notification skipped (disabled): ${type} for user ${userId}`);
      return false;
    }

    // Resolve user email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) {
      logger.warn(`Cannot send notification — no email for user ${userId}`);
      return false;
    }

    const html = buildNotificationHtml(subject, bodyContent);
    const text = subject; // Plain text fallback

    const result = await sendHtmlEmail({ to: user.email, subject: `${APP_NAME} — ${subject}`, html, text });
    if (result.success) {
      logger.info(`Notification sent: ${type} to ${user.email}`);
    } else {
      logger.error(`Notification failed: ${type} to ${user.email}`, { error: result.error });
    }
    return result.success;
  } catch (error: any) {
    logger.error("sendNotificationToUser error", { error: error.message, userId, type });
    return false;
  }
}

/**
 * Send a notification email to a worker (by workerId).
 * Resolves Worker → User → email, then checks preferences.
 */
export async function sendNotificationToWorker(
  workerId: string,
  type: NotificationType,
  subject: string,
  bodyContent: string,
): Promise<boolean> {
  try {
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) {
      logger.warn(`Cannot send notification — worker ${workerId} not found`);
      return false;
    }

    // If worker has a linked userId, use that for preferences + email
    if (worker.userId) {
      return sendNotificationToUser(worker.userId, type, subject, bodyContent);
    }

    // Fallback: send directly to worker email (no preference check possible)
    if (worker.email) {
      const html = buildNotificationHtml(subject, bodyContent);
      const result = await sendHtmlEmail({
        to: worker.email,
        subject: `${APP_NAME} — ${subject}`,
        html,
        text: subject,
      });
      return result.success;
    }

    logger.warn(`Cannot send notification — worker ${workerId} has no email or user link`);
    return false;
  } catch (error: any) {
    logger.error("sendNotificationToWorker error", { error: error.message, workerId, type });
    return false;
  }
}

/**
 * Send a notification to all users with a given role who have the preference enabled.
 * Useful for broadcasting to all ADMINs, SUPERVISORs, etc.
 */
export async function sendNotificationToRole(
  role: string,
  type: NotificationType,
  subject: string,
  bodyContent: string,
): Promise<number> {
  try {
    const users = await prisma.user.findMany({
      where: { role },
    });

    let sentCount = 0;
    for (const user of users) {
      const sent = await sendNotificationToUser(user.id, type, subject, bodyContent);
      if (sent) sentCount++;
    }

    return sentCount;
  } catch (error: any) {
    logger.error("sendNotificationToRole error", { error: error.message, role, type });
    return 0;
  }
}

// ─── Convenience Builders ────────────────────────────────────────
// These build the HTML body content for specific notification types.

export function buildScheduleNotificationBody(
  workerName: string,
  projectName: string,
  date: string,
  action: "assigned" | "changed",
): string {
  const verb = action === "assigned" ? "been assigned to" : "had a schedule change for";
  return `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
      ${escapeHtml(workerName)} has ${verb} <strong>${escapeHtml(projectName)}</strong> on <strong>${escapeHtml(date)}</strong>.
    </p>
  `;
}

export function buildTaskNotificationBody(
  taskTitle: string,
  action: "assigned" | "completed" | "due_soon",
  details?: string,
): string {
  const messages: Record<string, string> = {
    assigned: `You have been assigned a new task: <strong>${escapeHtml(taskTitle)}</strong>.`,
    completed: `Task <strong>${escapeHtml(taskTitle)}</strong> has been marked as completed.`,
    due_soon: `Task <strong>${escapeHtml(taskTitle)}</strong> is due soon.`,
  };

  return `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
      ${messages[action]}
    </p>
    ${details ? `<p style="margin:0 0 16px;color:#64748b;font-size:13px;line-height:1.6;">${escapeHtml(details)}</p>` : ""}
  `;
}

export function buildCertExpiryBody(
  workerName: string,
  certName: string,
  expiryDate: string,
  status: "expiring_soon" | "expired",
): string {
  const statusText = status === "expired" ? "has expired" : "is expiring soon";
  const urgency = status === "expired"
    ? "Worker cannot perform work until renewed."
    : "Please schedule renewal as soon as possible.";

  return `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
      <strong>${escapeHtml(workerName)}</strong>'s certification <strong>${escapeHtml(certName)}</strong> ${statusText} (${escapeHtml(expiryDate)}).
    </p>
    <p style="margin:0 0 16px;color:#ef4444;font-size:13px;font-weight:600;">${urgency}</p>
  `;
}

export function buildIncidentBody(
  projectName: string,
  incidentType: string,
  severity: string,
  description: string,
): string {
  const severityColor = severity === "critical" ? "#ef4444" : "#f59e0b";
  return `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
      An incident has been reported on <strong>${escapeHtml(projectName)}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 16px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;">Type</p>
        <p style="margin:0 0 12px;color:#1e293b;font-size:14px;">${escapeHtml(incidentType.replace(/_/g, " "))}</p>
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;">Severity</p>
        <p style="margin:0 0 12px;color:${severityColor};font-size:14px;font-weight:600;">${escapeHtml(severity)}</p>
        ${description ? `<p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;">Description</p><p style="margin:0;color:#1e293b;font-size:14px;">${escapeHtml(description)}</p>` : ""}
      </td></tr>
    </table>
  `;
}

export function buildFieldReportBody(
  projectName: string,
  reportDate: string,
  supervisorName: string,
): string {
  return `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
      A daily field report has been submitted for <strong>${escapeHtml(projectName)}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 16px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Date: <strong style="color:#1e293b;">${escapeHtml(reportDate)}</strong></p>
        <p style="margin:0;color:#64748b;font-size:12px;">Supervisor: <strong style="color:#1e293b;">${escapeHtml(supervisorName || "N/A")}</strong></p>
      </td></tr>
    </table>
  `;
}
