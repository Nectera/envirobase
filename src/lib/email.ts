import nodemailer from "nodemailer";
import { logger } from "./logger";
import { COMPANY_NAME, COMPANY_SHORT, COMPANY_LOCATION, BRAND_COLOR, APP_NAME } from "./branding";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // use STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  cc?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Escape HTML special characters to prevent injection attacks
 * Converts: < > & " ' to their HTML entity equivalents
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
}: SendEmailOptions): Promise<SendEmailResult> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return {
      success: false,
      error: "Email not configured. Add SMTP_USER and SMTP_PASSWORD to .env.local",
    };
  }

  try {
    const fromName = process.env.SMTP_FROM_NAME || COMPANY_NAME;

    // Escape HTML in user input and convert newlines to line breaks
    const escapedBody = escapeHtml(body);
    const htmlBody = escapedBody.replace(/\n/g, "<br>");

    const info = await transporter.sendMail({
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      to,
      cc: cc || undefined,
      replyTo: replyTo || process.env.SMTP_USER,
      subject,
      text: body,
      html: htmlBody,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    logger.error("Email send error", { error: error.message });
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}


/**
 * Send an email with raw HTML body (for branded templates).
 */
export async function sendHtmlEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return {
      success: false,
      error: "Email not configured. Add SMTP_USER and SMTP_PASSWORD to .env.local",
    };
  }

  try {
    const fromName = process.env.SMTP_FROM_NAME || COMPANY_NAME;
    const info = await transporter.sendMail({
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    logger.error("HTML email send error", { error: error.message });
    return { success: false, error: error.message || "Failed to send email" };
  }
}

function brandedEmailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A2D;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${COMPANY_SHORT}</h1>
          <p style="margin:4px 0 0;color:${BRAND_COLOR};font-size:13px;">Project Management System</p>
        </td></tr>
        <tr><td style="padding:32px;">
          \${content}
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
            ${COMPANY_NAME} &bull; ${COMPANY_LOCATION}<br>
            This is an automated message. Please do not reply directly.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<SendEmailResult> {
  const html = brandedEmailWrapper(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Password Reset Request</h2>
    <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
      We received a request to reset your password. Click the button below to set a new password.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="\${resetUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
          Reset Password
        </a>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;">This link will expire in <strong>1 hour</strong>.</p>
    <p style="margin:0;color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
  `);

  const text = `Password Reset Request\n\nWe received a request to reset your password. Visit this link to set a new password:\n\n\${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`;

  return sendHtmlEmail({ to, subject: `Reset Your Password — ${COMPANY_SHORT}`, html, text });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  role: string,
  temporaryPassword: string,
  loginUrl: string,
): Promise<SendEmailResult> {
  const roleDisplay = role.charAt(0) + role.slice(1).toLowerCase();
  const html = brandedEmailWrapper(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Welcome to ${APP_NAME}, \${escapeHtml(name)}!</h2>
    <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
      Your account has been created. Here are your login details:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Your Credentials</p>
        <p style="margin:0 0 6px;color:#1e293b;font-size:14px;"><strong>Email:</strong> \${escapeHtml(to)}</p>
        <p style="margin:0 0 6px;color:#1e293b;font-size:14px;"><strong>Temporary Password:</strong> \${escapeHtml(temporaryPassword)}</p>
        <p style="margin:0;color:#1e293b;font-size:14px;"><strong>Role:</strong> \${escapeHtml(roleDisplay)}</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:0 0 24px;">
        <a href="\${loginUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
          Sign In Now
        </a>
      </td></tr>
    </table>
    <p style="margin:0;color:#ef4444;font-size:13px;font-weight:600;">Please change your password after your first login.</p>
  `);

  const text = `Welcome to ${APP_NAME}, \${name}!\n\nYour account has been created.\n\nEmail: \${to}\nTemporary Password: \${temporaryPassword}\nRole: \${roleDisplay}\n\nSign in at: \${loginUrl}\n\nPlease change your password after your first login.`;

  return sendHtmlEmail({ to, subject: `Welcome to ${COMPANY_SHORT} — Your Account is Ready`, html, text });
}
