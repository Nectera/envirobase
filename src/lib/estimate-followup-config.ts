import { prisma } from "@/lib/prisma";
import { sendHtmlEmail } from "@/lib/email";

/**
 * 3-touch email drip sequence for estimate follow-ups.
 *
 * Sent only when estimate status is "sent" and hasn't changed to
 * "approved" or "rejected". Stops immediately if status changes.
 *
 * Timing:
 *   Touch 1 — Day 3 — Friendly check-in
 *   Touch 2 — Day 7 — Gentle reminder with offer to answer questions
 *   Touch 3 — Day 14 — Final follow-up
 */
export const ESTIMATE_FOLLOWUP_SEQUENCE = [
  {
    touch: 1,
    delayDays: 3,
    subject: "Following up on your Xtract Environmental estimate",
    template:
      "Hi {clientName},\n\nI wanted to check in regarding the estimate we recently sent over for your project. If you have any questions or would like to discuss the details, we're happy to help.\n\nFeel free to reply to this email or give us a call anytime.\n\nBest regards,\nXtract Environmental Services",
  },
  {
    touch: 2,
    delayDays: 7,
    subject: "Any questions about your estimate?",
    template:
      "Hi {clientName},\n\nJust a quick follow-up on the estimate we sent for your project. We understand these decisions take time, and we're here if you need any clarification or adjustments.\n\nWould you like to schedule a quick call to go over everything?\n\nBest regards,\nXtract Environmental Services",
  },
  {
    touch: 3,
    delayDays: 14,
    subject: "Your Xtract Environmental estimate",
    template:
      "Hi {clientName},\n\nI wanted to reach out one last time about the estimate for your project. If your needs have changed or you'd like to revisit the scope, we're happy to update things.\n\nNo pressure at all — just let us know if there's anything we can do.\n\nBest regards,\nXtract Environmental Services",
  },
];

export const ESTIMATE_FOLLOWUP_DEFAULTS = {
  enabled: true,
  sequence: ESTIMATE_FOLLOWUP_SEQUENCE,
};

export type EstimateFollowUpConfig = typeof ESTIMATE_FOLLOWUP_DEFAULTS;

// ─── Branded email builder ─────────────────────────────────────────
export function buildFollowUpEmailHtml(body: string): string {
  const htmlBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A2D;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Xtract Environmental</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0;color:#334155;font-size:15px;line-height:1.6;">${htmlBody}</p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">Xtract Environmental Services</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Send a specific touch ──────────────────────────────────────────
export async function sendFollowUpTouch(
  followUp: { clientName: string | null; clientEmail: string | null },
  touchIndex: number,
  config: EstimateFollowUpConfig
): Promise<{ success: boolean; error?: string }> {
  const sequence = config.sequence || ESTIMATE_FOLLOWUP_SEQUENCE;
  const step = sequence[touchIndex];
  if (!step) return { success: false, error: `No sequence step at index ${touchIndex}` };

  if (!followUp.clientEmail) {
    return { success: false, error: "No client email address" };
  }

  const body = step.template.replace(/\{clientName\}/g, followUp.clientName || "there");
  const subject = step.subject.replace(/\{clientName\}/g, followUp.clientName || "");

  const html = buildFollowUpEmailHtml(body);
  const result = await sendHtmlEmail({
    to: followUp.clientEmail,
    subject,
    html,
    text: body,
  });

  return result;
}

export async function getEstimateFollowUpConfig(): Promise<EstimateFollowUpConfig> {
  const setting = await prisma.setting.findUnique({ where: { key: "estimateFollowUpConfig" } });
  if (!setting) return ESTIMATE_FOLLOWUP_DEFAULTS;
  try {
    const parsed = JSON.parse(setting.value);
    return {
      ...ESTIMATE_FOLLOWUP_DEFAULTS,
      ...parsed,
      sequence: parsed.sequence || ESTIMATE_FOLLOWUP_SEQUENCE,
    };
  } catch {
    return ESTIMATE_FOLLOWUP_DEFAULTS;
  }
}
