import { prisma } from "./prisma";
import { sendHtmlEmail, escapeHtml } from "./email";
import { logger } from "./logger";

/**
 * Customer Portal Notification System
 *
 * Sends branded email notifications to clients when portal-related
 * events occur (status changes, document uploads, estimate updates,
 * messages, portal creation).
 *
 * Each notification checks the org's portal notification preferences
 * before sending. Emails use the org's branding (name, color) and
 * include a "View Your Project" button linking to the client portal.
 */

// ─── Types ───────────────────────────────────────────────────────

type PortalNotificationType =
  | "portalStatusChange"
  | "portalDocumentUpload"
  | "portalEstimateUpdate"
  | "portalMessage";

interface OrgBranding {
  companyName: string;
  companyShort: string;
  brandColor: string;
  companyLocation: string;
  supportEmail: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

async function getOrgBranding(organizationId: string): Promise<OrgBranding> {
  const defaults: OrgBranding = {
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "EnviroBase",
    companyShort: process.env.NEXT_PUBLIC_COMPANY_SHORT || "EnviroBase",
    brandColor: process.env.NEXT_PUBLIC_BRAND_COLOR || "#2D5A42",
    companyLocation: process.env.NEXT_PUBLIC_COMPANY_LOCATION || "",
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@envirobase.app",
  };

  try {
    const org = await (prisma as any).organization.findUnique({
      where: { id: organizationId },
      select: {
        companyName: true,
        companyShort: true,
        brandColor: true,
        companyLocation: true,
        supportEmail: true,
      },
    });
    if (org) {
      return {
        companyName: org.companyName || defaults.companyName,
        companyShort: org.companyShort || defaults.companyShort,
        brandColor: org.brandColor || defaults.brandColor,
        companyLocation: org.companyLocation || defaults.companyLocation,
        supportEmail: org.supportEmail || defaults.supportEmail,
      };
    }
  } catch (error) {
    logger.error("Failed to fetch org branding for portal notification", { organizationId, error });
  }
  return defaults;
}

/**
 * Check whether a portal notification type is enabled for the org.
 * We check the project creator's (or any admin's) notification preferences.
 * Portal notifications default to ON.
 */
async function isPortalNotificationEnabled(
  organizationId: string,
  type: PortalNotificationType,
): Promise<boolean> {
  try {
    // Check any admin user's preferences — portal notifications are org-wide toggles
    const adminUser = await prisma.user.findFirst({
      where: { organizationId, role: "ADMIN" },
      select: { id: true },
    });
    if (!adminUser) return true; // Default to enabled

    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: adminUser.id },
    });

    if (!prefs) return true; // No prefs saved = defaults = all enabled

    const val = (prefs as any)[type];
    return val !== undefined ? !!val : true;
  } catch {
    return true; // Default to sending on error
  }
}

/**
 * Find active portal(s) for a project and return the portal URL + client email.
 */
async function getActivePortals(projectId: string): Promise<
  Array<{ token: string; clientEmail: string | null; clientName: string | null }>
> {
  try {
    const portals = await prisma.customerPortal.findMany({
      where: { projectId, active: true },
      select: { token: true, clientEmail: true, clientName: true },
    });
    return portals;
  } catch {
    return [];
  }
}

function getPortalUrl(token: string): string {
  const appUrl = process.env.NEXTAUTH_URL || "https://app.envirobase.app";
  return `${appUrl}/portal/${token}`;
}

/**
 * Build the branded HTML email wrapper for portal notifications.
 * Dark green header matching existing Xtract style, green accents.
 */
function buildPortalEmailHtml(
  branding: OrgBranding,
  subject: string,
  bodyContent: string,
  portalUrl: string,
): string {
  const headerBg = "#1B3A2D"; // Dark green header
  const accentColor = branding.brandColor;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:${headerBg};padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${escapeHtml(branding.companyShort)}</h1>
          <p style="margin:4px 0 0;color:${accentColor};font-size:13px;">Customer Portal Update</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;font-weight:600;">${escapeHtml(subject)}</h2>
          ${bodyContent}
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:24px 0 8px;">
              <a href="${portalUrl}" style="display:inline-block;background:${accentColor};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                View Your Project
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
            ${escapeHtml(branding.companyName)}${branding.companyLocation ? ` &bull; ${escapeHtml(branding.companyLocation)}` : ""}<br>
            This is an automated message from your project portal.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Core send function — resolves portals, checks preferences, sends email.
 */
async function sendPortalNotification(
  projectId: string,
  organizationId: string,
  type: PortalNotificationType,
  subject: string,
  bodyContent: string,
): Promise<boolean> {
  try {
    // Check if this notification type is enabled
    const enabled = await isPortalNotificationEnabled(organizationId, type);
    if (!enabled) {
      logger.info(`Portal notification skipped (disabled): ${type} for project ${projectId}`);
      return false;
    }

    // Find active portals for this project
    const portals = await getActivePortals(projectId);
    if (portals.length === 0) {
      logger.info(`Portal notification skipped (no active portal): ${type} for project ${projectId}`);
      return false;
    }

    const branding = await getOrgBranding(organizationId);
    let sent = false;

    for (const portal of portals) {
      if (!portal.clientEmail) continue;

      const portalUrl = getPortalUrl(portal.token);
      const html = buildPortalEmailHtml(branding, subject, bodyContent, portalUrl);
      const text = `${subject}\n\nView your project portal: ${portalUrl}`;

      const result = await sendHtmlEmail({
        to: portal.clientEmail,
        subject: `${branding.companyShort} — ${subject}`,
        html,
        text,
        organizationId,
      });

      if (result.success) {
        logger.info(`Portal notification sent: ${type} to ${portal.clientEmail}`);
        sent = true;
      } else {
        logger.error(`Portal notification failed: ${type} to ${portal.clientEmail}`, { error: result.error });
      }
    }

    return sent;
  } catch (error: any) {
    logger.error("sendPortalNotification error", { error: error.message, projectId, type });
    return false;
  }
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Notify client when project status changes.
 */
export async function notifyClientStatusChange(
  projectId: string,
  organizationId: string,
  projectName: string,
  oldStatus: string,
  newStatus: string,
): Promise<boolean> {
  const formatStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const bodyContent = `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
      Your project <strong>${escapeHtml(projectName)}</strong> has been updated.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 16px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Status Changed</p>
        <p style="margin:0;color:#1e293b;font-size:14px;">
          ${escapeHtml(formatStatus(oldStatus))} &rarr; <strong>${escapeHtml(formatStatus(newStatus))}</strong>
        </p>
      </td></tr>
    </table>
  `;

  return sendPortalNotification(
    projectId,
    organizationId,
    "portalStatusChange",
    `Project Status Update: ${formatStatus(newStatus)}`,
    bodyContent,
  );
}

/**
 * Notify client when a document is uploaded to their project.
 */
export async function notifyClientDocumentUploaded(
  projectId: string,
  organizationId: string,
  projectName: string,
  documentName: string,
  docType: string,
): Promise<boolean> {
  const formatType = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const bodyContent = `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
      A new document has been added to your project <strong>${escapeHtml(projectName)}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 16px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Document</p>
        <p style="margin:0 0 8px;color:#1e293b;font-size:14px;"><strong>${escapeHtml(documentName)}</strong></p>
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Type</p>
        <p style="margin:0;color:#1e293b;font-size:14px;">${escapeHtml(formatType(docType))}</p>
      </td></tr>
    </table>
  `;

  return sendPortalNotification(
    projectId,
    organizationId,
    "portalDocumentUpload",
    "New Document Available",
    bodyContent,
  );
}

/**
 * Notify client when an estimate is submitted, approved, or denied.
 */
export async function notifyClientEstimateUpdate(
  projectId: string,
  organizationId: string,
  projectName: string,
  estimateTitle: string,
  action: "submitted" | "approved" | "denied",
  amount?: number,
): Promise<boolean> {
  const actionLabels: Record<string, string> = {
    submitted: "Submitted for Review",
    approved: "Approved",
    denied: "Denied",
  };
  const actionColors: Record<string, string> = {
    submitted: "#3b82f6",
    approved: "#22c55e",
    denied: "#ef4444",
  };

  const amountStr = amount != null
    ? `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "";

  const bodyContent = `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
      An estimate for your project <strong>${escapeHtml(projectName)}</strong> has been updated.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 16px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Estimate</p>
        <p style="margin:0 0 8px;color:#1e293b;font-size:14px;"><strong>${escapeHtml(estimateTitle)}</strong></p>
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Status</p>
        <p style="margin:0;color:${actionColors[action]};font-size:14px;font-weight:600;">${actionLabels[action]}</p>
        ${amountStr ? `<p style="margin:8px 0 0;color:#64748b;font-size:12px;">Amount: <strong style="color:#1e293b;">${amountStr}</strong></p>` : ""}
      </td></tr>
    </table>
  `;

  return sendPortalNotification(
    projectId,
    organizationId,
    "portalEstimateUpdate",
    `Estimate ${actionLabels[action]}`,
    bodyContent,
  );
}

/**
 * Notify client when a team member sends a portal message.
 */
export async function notifyClientMessage(
  projectId: string,
  organizationId: string,
  projectName: string,
  senderName: string,
  messagePreview: string,
): Promise<boolean> {
  // Truncate preview to 200 chars
  const preview = messagePreview.length > 200
    ? messagePreview.slice(0, 200) + "..."
    : messagePreview;

  const bodyContent = `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
      You have a new message on your project <strong>${escapeHtml(projectName)}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 16px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;">From</p>
        <p style="margin:0 0 8px;color:#1e293b;font-size:14px;"><strong>${escapeHtml(senderName)}</strong></p>
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Message</p>
        <p style="margin:0;color:#1e293b;font-size:14px;line-height:1.6;">${escapeHtml(preview)}</p>
      </td></tr>
    </table>
  `;

  return sendPortalNotification(
    projectId,
    organizationId,
    "portalMessage",
    "New Message on Your Project",
    bodyContent,
  );
}

/**
 * Send the initial portal access email when a portal is created.
 * This always sends (not gated by notification preferences) since it's
 * the access link the client needs.
 */
export async function notifyClientPortalCreated(
  projectId: string,
  organizationId: string,
  projectName: string,
  clientEmail: string,
  portalToken: string,
): Promise<boolean> {
  try {
    const branding = await getOrgBranding(organizationId);
    const portalUrl = getPortalUrl(portalToken);

    const bodyContent = `
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
        Welcome! A project portal has been created for you to track the progress of your project <strong>${escapeHtml(projectName)}</strong>.
      </p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
        You can use this portal to view project updates, documents, estimates, and communicate with the project team.
      </p>
      <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
        Bookmark the link below to access your portal at any time:
      </p>
    `;

    const html = buildPortalEmailHtml(branding, "Your Project Portal is Ready", bodyContent, portalUrl);
    const text = `Your project portal for "${projectName}" is ready.\n\nAccess your portal here: ${portalUrl}\n\nYou can view project updates, documents, and communicate with the team.`;

    const result = await sendHtmlEmail({
      to: clientEmail,
      subject: `${branding.companyShort} — Your Project Portal is Ready`,
      html,
      text,
      organizationId,
    });

    if (result.success) {
      logger.info(`Portal created notification sent to ${clientEmail}`);
    } else {
      logger.error(`Portal created notification failed for ${clientEmail}`, { error: result.error });
    }

    return result.success;
  } catch (error: any) {
    logger.error("notifyClientPortalCreated error", { error: error.message, projectId });
    return false;
  }
}
