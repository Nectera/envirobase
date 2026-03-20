import nodemailer from "nodemailer";
import { Resend } from "resend";
import { logger } from "./logger";
import prisma from "./prisma";

// Cache transporters per org to avoid recreating on every email
const transporterCache = new Map<string, { transporter: any; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Resend client (lazy-initialized)
let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Default "from" when using Resend
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || "EnviroBase";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "notifications@envirobase.app";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

/**
 * Get SMTP config for an organization.
 * Falls back to env vars if org has no SMTP settings configured.
 */
async function getSmtpConfig(organizationId?: string | null): Promise<SmtpConfig | null> {
  // Try org-specific SMTP first
  if (organizationId) {
    try {
      const org = await (prisma as any).organization.findUnique({
        where: { id: organizationId },
        select: {
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          smtpPassword: true,
          smtpFromName: true,
          smtpFromEmail: true,
          smtpSecure: true,
          companyName: true,
        },
      });

      if (org?.smtpHost && org?.smtpUser && org?.smtpPassword) {
        return {
          host: org.smtpHost,
          port: org.smtpPort || 587,
          secure: org.smtpSecure || false,
          user: org.smtpUser,
          password: org.smtpPassword,
          fromName: org.smtpFromName || org.companyName || "EnviroBase",
          fromEmail: org.smtpFromEmail || org.smtpUser,
        };
      }
    } catch (error) {
      logger.error("Failed to fetch org SMTP config", { organizationId, error });
    }
  }

  // Fall back to env vars
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      fromName: process.env.SMTP_FROM_NAME || "EnviroBase",
      fromEmail: process.env.SMTP_USER,
    };
  }

  return null;
}

/**
 * Get or create a nodemailer transporter for the given SMTP config.
 * Cached per org to avoid recreating connections.
 */
function getTransporter(config: SmtpConfig, cacheKey: string) {
  const cached = transporterCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.transporter;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  transporterCache.set(cacheKey, {
    transporter,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  cc?: string;
  organizationId?: string | null;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Escape HTML special characters to prevent injection attacks
 */
export function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char] || char);
}

export async function sendEmail({
  to,
  subject,
  body,
  replyTo,
  cc,
  organizationId,
}: SendEmailOptions): Promise<SendEmailResult> {
  const config = await getSmtpConfig(organizationId);

  // If SMTP is configured (org-level or env), use Nodemailer
  if (config) {
    try {
      const cacheKey = organizationId || "env-default";
      const transporter = getTransporter(config, cacheKey);

      const escapedBody = escapeHtml(body);
      const htmlBody = escapedBody.replace(/\n/g, "<br>");

      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        cc: cc || undefined,
        replyTo: replyTo || config.fromEmail,
        subject,
        text: body,
        html: htmlBody,
      });

      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      logger.error("Email send error (SMTP)", { error: error.message, organizationId });
      return { success: false, error: error.message || "Failed to send email" };
    }
  }

  // Fallback: use Resend API
  return sendViaResend({ to, subject, text: body, html: escapeHtml(body).replace(/\n/g, "<br>"), replyTo, cc });
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD) || !!process.env.RESEND_API_KEY;
}

/**
 * Check if email is configured for a specific organization
 */
export async function isOrgEmailConfigured(organizationId?: string | null): Promise<boolean> {
  const config = await getSmtpConfig(organizationId);
  if (config !== null) return true;
  // Resend is always available if configured at platform level
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send an email with raw HTML body (for branded templates).
 */
export async function sendHtmlEmail({
  to,
  subject,
  html,
  text,
  organizationId,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  organizationId?: string | null;
}): Promise<SendEmailResult> {
  const config = await getSmtpConfig(organizationId);

  // If SMTP is configured (org-level or env), use Nodemailer
  if (config) {
    try {
      const cacheKey = organizationId || "env-default";
      const transporter = getTransporter(config, cacheKey);

      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        subject,
        text,
        html,
      });
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      logger.error("HTML email send error (SMTP)", { error: error.message, organizationId });
      return { success: false, error: error.message || "Failed to send email" };
    }
  }

  // Fallback: use Resend API
  return sendViaResend({ to, subject, text, html });
}

/**
 * Get branded email wrapper for an organization.
 * Pulls branding from the org's database record.
 */
async function getOrgBranding(organizationId?: string | null) {
  const defaults = {
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "EnviroBase",
    companyShort: process.env.NEXT_PUBLIC_COMPANY_SHORT || "EnviroBase",
    brandColor: process.env.NEXT_PUBLIC_BRAND_COLOR || "#2D5A42",
    accentColor: "#7BC143",
    companyLocation: process.env.NEXT_PUBLIC_COMPANY_LOCATION || "",
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@envirobase.app",
  };

  if (!organizationId) return defaults;

  try {
    const org = await (prisma as any).organization.findUnique({
      where: { id: organizationId },
      select: {
        companyName: true,
        companyShort: true,
        brandColor: true,
        accentColor: true,
        companyLocation: true,
        supportEmail: true,
      },
    });
    if (org) {
      return {
        companyName: org.companyName || defaults.companyName,
        companyShort: org.companyShort || defaults.companyShort,
        brandColor: org.brandColor || defaults.brandColor,
        accentColor: org.accentColor || defaults.accentColor,
        companyLocation: org.companyLocation || defaults.companyLocation,
        supportEmail: org.supportEmail || defaults.supportEmail,
      };
    }
  } catch (error) {
    logger.error("Failed to fetch org branding", { organizationId, error });
  }
  return defaults;
}

export async function brandedEmailWrapper(content: string, organizationId?: string | null): Promise<string> {
  const b = await getOrgBranding(organizationId);
  const appUrl = process.env.NEXTAUTH_URL || "https://app.envirobase.app";
  const unsubscribeUrl = `${appUrl}/settings/notifications`;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:${b.brandColor};padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${b.companyShort}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
            ${b.companyName}${b.companyLocation ? ` &bull; ${b.companyLocation}` : ""}<br>
            This is an automated message. Please do not reply directly.<br>
            <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Manage notification preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, organizationId?: string | null): Promise<SendEmailResult> {
  const b = await getOrgBranding(organizationId);
  const html = await brandedEmailWrapper(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Password Reset Request</h2>
    <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
      We received a request to reset your password. Click the button below to set a new password.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${resetUrl}" style="display:inline-block;background:${b.brandColor};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
          Reset Password
        </a>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;">This link will expire in <strong>1 hour</strong>.</p>
    <p style="margin:0;color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
  `, organizationId);

  const text = `Password Reset Request\n\nWe received a request to reset your password. Visit this link to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`;

  return sendHtmlEmail({ to, subject: `Reset Your Password — ${b.companyShort}`, html, text, organizationId });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  role: string,
  temporaryPassword: string,
  loginUrl: string,
  organizationId?: string | null,
): Promise<SendEmailResult> {
  const b = await getOrgBranding(organizationId);
  const roleDisplay = role.charAt(0) + role.slice(1).toLowerCase();
  const html = await brandedEmailWrapper(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Welcome to ${b.companyShort}, ${escapeHtml(name)}!</h2>
    <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
      Your account has been created. Here are your login details:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Your Credentials</p>
        <p style="margin:0 0 6px;color:#1e293b;font-size:14px;"><strong>Email:</strong> ${escapeHtml(to)}</p>
        <p style="margin:0 0 6px;color:#1e293b;font-size:14px;"><strong>Temporary Password:</strong> ${escapeHtml(temporaryPassword)}</p>
        <p style="margin:0;color:#1e293b;font-size:14px;"><strong>Role:</strong> ${escapeHtml(roleDisplay)}</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:0 0 24px;">
        <a href="${loginUrl}" style="display:inline-block;background:${b.brandColor};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
          Sign In Now
        </a>
      </td></tr>
    </table>
    <p style="margin:0;color:#ef4444;font-size:13px;font-weight:600;">Please change your password after your first login.</p>
  `, organizationId);

  const text = `Welcome to ${b.companyShort}, ${name}!\n\nYour account has been created.\n\nEmail: ${to}\nTemporary Password: ${temporaryPassword}\nRole: ${roleDisplay}\n\nSign in at: ${loginUrl}\n\nPlease change your password after your first login.`;

  return sendHtmlEmail({ to, subject: `Welcome to ${b.companyShort} — Your Account is Ready`, html, text, organizationId });
}

/**
 * Send email via Resend API (platform default for orgs without SMTP).
 */
async function sendViaResend({
  to,
  subject,
  text,
  html,
  replyTo,
  cc,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  cc?: string;
}): Promise<SendEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return {
      success: false,
      error: "Email not configured. Set RESEND_API_KEY or configure SMTP in Settings.",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: to.split(",").map((e) => e.trim()),
      cc: cc ? cc.split(",").map((e) => e.trim()) : undefined,
      replyTo: replyTo || undefined,
      subject,
      text,
      html,
    });

    if (error) {
      logger.error("Resend API error", { error, to });
      return { success: false, error: error.message || "Resend API error" };
    }

    return { success: true, messageId: data?.id };
  } catch (error: any) {
    logger.error("Resend send error", { error: error.message, to });
    return { success: false, error: error.message || "Failed to send via Resend" };
  }
}

/**
 * Test SMTP connection with provided credentials.
 * Returns true if connection succeeds, error message if not.
 */
export async function testSmtpConnection(config: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Connection failed" };
  }
}
