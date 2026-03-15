import { prisma } from "@/lib/prisma";

/**
 * 3-touch drip sequence for feedback surveys.
 *
 * Research-backed timing (sources: Birdeye, GatherUp, Plaudit, SmartSMS):
 *   Touch 1 — Day 0 — SMS — Immediate, while experience is fresh (90% read in 3 min)
 *   Touch 2 — Day 2 — Email — Longer format for people who ignore texts
 *   Touch 3 — Day 5 — SMS — Final gentle nudge
 *
 * SMS gets 15-25% response vs 2-5% email. Alternating channels avoids fatigue.
 * 3 touches boosts response from ~5-8% to 12-18%. After 3, stop.
 */
export const DRIP_SEQUENCE = [
  {
    touch: 1,
    delayDays: 0,
    channel: "sms" as const,
    smsTemplate:
      "Hi {clientName}, this is EnviroBase! Thank you for trusting us with your recent project. We'd love to hear how it went — it takes less than 30 seconds: {surveyUrl}",
    emailSubject: "",
    emailTemplate: "",
  },
  {
    touch: 2,
    delayDays: 2,
    channel: "email" as const,
    smsTemplate: "",
    emailSubject: "How was your experience with EnviroBase?",
    emailTemplate:
      "Hi {clientName},\n\nWe recently completed work at your property and wanted to check in. Your feedback helps us maintain the high standards our customers expect.\n\nWould you take 30 seconds to let us know how we did? Just click the link below.\n\nWe truly appreciate your time.",
  },
  {
    touch: 3,
    delayDays: 5,
    channel: "sms" as const,
    smsTemplate:
      "Hi {clientName}, just a quick follow-up from EnviroBase. If you have a moment, we'd really appreciate your feedback on our recent work: {surveyUrl} Thanks!",
    emailSubject: "",
    emailTemplate: "",
  },
];

export const REVIEW_CONFIG_DEFAULTS = {
  locations: [
    { key: "front_range", name: "Front Range", reviewUrl: "" },
    { key: "western_slope", name: "Western Slope", reviewUrl: "" },
  ],
  autoSendEnabled: true,
  defaultMethod: "both" as const,
  // Drip sequence config
  sequence: DRIP_SEQUENCE,
  // Legacy single-send templates (kept for manual sends / fallback)
  emailSubject: "How was your experience with EnviroBase?",
  smsBody:
    "Hi {clientName}, thank you for choosing EnviroBase! We'd love your feedback on your recent project. Please tap the link to share your experience: {surveyUrl}",
};

export type ReviewConfig = typeof REVIEW_CONFIG_DEFAULTS;

export async function getReviewConfig(): Promise<ReviewConfig> {
  const setting = await prisma.setting.findUnique({ where: { key: "reviewConfig" } });
  if (!setting) return REVIEW_CONFIG_DEFAULTS;
  try {
    const parsed = JSON.parse(setting.value);
    return {
      ...REVIEW_CONFIG_DEFAULTS,
      ...parsed,
      sequence: parsed.sequence || DRIP_SEQUENCE,
    };
  } catch {
    return REVIEW_CONFIG_DEFAULTS;
  }
}
