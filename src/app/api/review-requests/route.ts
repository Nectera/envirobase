import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_READ_LIMIT, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { sendHtmlEmail } from "@/lib/email";
import { getValidToken, rcApiCall } from "@/lib/ringcentral";
import { getReviewConfig, DRIP_SEQUENCE } from "@/lib/review-config";
import { COMPANY_SHORT, COMPANY_NAME, COMPANY_LOCATION, BRAND_COLOR, APP_URL } from "@/lib/branding";

export const dynamic = "force-dynamic";

export function buildSurveyUrl(token: string) {
  return `${APP_URL}/feedback/${token}`;
}

export function buildEmailHtml(clientName: string, surveyUrl: string, bodyText?: string) {
  const escapedBody = (bodyText || "")
    .replace("{clientName}", clientName || "there")
    .replace(/\n/g, "<br>");

  const bodyHtml = bodyText
    ? escapedBody
    : `Hi ${clientName || "there"},<br><br>
       Thank you for choosing ${COMPANY_NAME} for your recent project.
       We'd love to hear about your experience — it only takes 30 seconds!`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A2D;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${COMPANY_SHORT}</h1>
          <p style="margin:4px 0 0;color:${BRAND_COLOR};font-size:13px;">Your Feedback Matters</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">How was your experience?</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
            ${bodyHtml}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${surveyUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;">
                Share Your Feedback
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
            Or copy this link: ${surveyUrl}
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
            ${COMPANY_NAME} &bull; ${COMPANY_LOCATION}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send a single touch (SMS or email) for a review request.
 * Returns { success, channel, error? }
 */
export async function sendTouch(
  reviewRequest: {
    token: string;
    clientName: string | null;
    clientEmail: string | null;
    clientPhone: string | null;
  },
  touchIndex: number,
  config: any
) {
  const sequence = config.sequence || DRIP_SEQUENCE;
  const step = sequence[touchIndex];
  if (!step) return { success: false, channel: "none", error: "No step found" };

  const surveyUrl = buildSurveyUrl(reviewRequest.token);
  const name = reviewRequest.clientName || "Valued Customer";

  if (step.channel === "sms") {
    if (!reviewRequest.clientPhone) {
      return { success: false, channel: "sms", error: "No phone number" };
    }
    try {
      const auth = await getValidToken();
      if (!auth) return { success: false, channel: "sms", error: "RingCentral not connected" };
      const smsText = (step.smsTemplate || config.smsBody || "")
        .replace(/\{clientName\}/g, name)
        .replace(/\{surveyUrl\}/g, surveyUrl);
      await rcApiCall("POST", "/account/~/extension/~/sms", {
        from: { phoneNumber: auth.phoneNumber },
        to: [{ phoneNumber: reviewRequest.clientPhone }],
        text: smsText,
      });
      return { success: true, channel: "sms" };
    } catch (err: any) {
      return { success: false, channel: "sms", error: err.message };
    }
  }

  if (step.channel === "email") {
    if (!reviewRequest.clientEmail) {
      return { success: false, channel: "email", error: "No email address" };
    }
    try {
      const subject = step.emailSubject || config.emailSubject || `How was your experience with ${COMPANY_SHORT}?`;
      const result = await sendHtmlEmail({
        to: reviewRequest.clientEmail,
        subject,
        html: buildEmailHtml(name, surveyUrl, step.emailTemplate),
        text: `Hi ${name}, we'd love your feedback: ${surveyUrl}`,
      });
      return { success: result.success, channel: "email", error: result.error };
    } catch (err: any) {
      return { success: false, channel: "email", error: err.message };
    }
  }

  return { success: false, channel: step.channel, error: "Unknown channel" };
}

/**
 * Calculate the next touch timestamp.
 */
function getNextTouchAt(touchIndex: number, config: any): Date | null {
  const sequence = config.sequence || DRIP_SEQUENCE;
  const nextStep = sequence[touchIndex];
  if (!nextStep) return null;
  const now = new Date();
  now.setDate(now.getDate() + nextStep.delayDays);
  return now;
}

function getNextTouchType(touchIndex: number, config: any): string | null {
  const sequence = config.sequence || DRIP_SEQUENCE;
  const nextStep = sequence[touchIndex];
  return nextStep?.channel || null;
}

/**
 * GET /api/review-requests?projectId=xxx or ?month=YYYY-MM
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id || "anonymous";
    const rl = checkRateLimit(`read:${userId}`, API_READ_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const month = searchParams.get("month");

    const where: any = orgWhere(orgId);
    if (projectId) where.projectId = projectId;
    if (month) {
      const start = new Date(`${month}-01T00:00:00Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      where.sentAt = { gte: start, lt: end };
    }

    const requests = await prisma.reviewRequest.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, client: true, projectNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: requests.length,
      sent: requests.filter((r: any) => r.sentAt).length,
      completed: requests.filter((r: any) => r.surveyCompletedAt).length,
      highRating: requests.filter((r: any) => r.rating && r.rating >= 4).length,
      lowRating: requests.filter((r: any) => r.rating && r.rating <= 3).length,
      reviewsConfirmed: requests.filter((r: any) => r.reviewConfirmed).length,
      reviewsClicked: requests.filter((r: any) => r.googleReviewClicked).length,
    };

    return NextResponse.json({ requests, stats });
  } catch (error: any) {
    console.error("Review requests GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/review-requests
 * Create a feedback survey and send Touch 1 (SMS).
 * Schedules Touch 2 for +2 days automatically.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const user = session.user;
    const rl = checkRateLimit(`write:${user.id}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { projectId, method, googleLocationKey, clientEmail, clientPhone, clientName } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const config = await getReviewConfig();
    const sendMethod = method || config.defaultMethod || "both";
    const email = clientEmail || project.clientEmail;
    const phone = clientPhone || project.clientPhone;
    const name = clientName || project.client || "Valued Customer";

    // Validate we have at least some contact info
    if (!email && !phone) {
      return NextResponse.json({ error: "Client email or phone is required" }, { status: 400 });
    }

    // Create the review request record
    const reviewRequest = await prisma.reviewRequest.create({
      data: orgData(orgId, {
        projectId,
        clientName: name,
        clientEmail: email,
        clientPhone: phone,
        googleLocationKey: googleLocationKey || config.locations?.[0]?.key || "front_range",
        method: sendMethod,
        sentBy: user.id,
        sentByName: user.name || "Unknown",
        status: "pending",
        touchesSent: 0,
        nextTouchAt: new Date(), // Touch 1 fires immediately
        nextTouchType: "sms",
      }),
    });

    // Send Touch 1 (SMS — immediate, highest open rate)
    const touchResult = await sendTouch(
      { token: reviewRequest.token, clientName: name, clientEmail: email, clientPhone: phone },
      0,
      config
    );

    // If SMS failed but we have email, try email as fallback for touch 1
    let fallbackResult = null;
    if (!touchResult.success && email && phone) {
      // SMS failed, send email instead
      const surveyUrl = buildSurveyUrl(reviewRequest.token);
      try {
        const result = await sendHtmlEmail({
          to: email,
          subject: config.emailSubject || `How was your experience with ${COMPANY_SHORT}?`,
          html: buildEmailHtml(name, surveyUrl),
          text: `Hi ${name}, we'd love your feedback: ${surveyUrl}`,
        });
        fallbackResult = { success: result.success, channel: "email", error: result.error };
      } catch (err: any) {
        fallbackResult = { success: false, channel: "email", error: err.message };
      }
    }

    const anySent = touchResult.success || fallbackResult?.success;

    // Schedule next touch (Touch 2 = email in 2 days)
    const nextAt = getNextTouchAt(1, config);
    const nextType = getNextTouchType(1, config);

    await prisma.reviewRequest.update({
      where: { id: reviewRequest.id },
      data: {
        sentAt: anySent ? new Date() : null,
        status: anySent ? "sent" : "failed",
        touchesSent: anySent ? 1 : 0,
        lastTouchAt: anySent ? new Date() : null,
        nextTouchAt: anySent ? nextAt : null,
        nextTouchType: anySent ? nextType : null,
        failureReason: !anySent
          ? `Touch 1: ${touchResult.error}${fallbackResult ? ` | Fallback: ${fallbackResult.error}` : ""}`
          : null,
      },
    });

    // Log activity
    try {
      await prisma.activity.create({
        data: orgData(orgId, {
          type: "review_request",
          description: `Feedback survey (touch 1/${DRIP_SEQUENCE.length}) sent to ${name} via ${touchResult.success ? touchResult.channel : fallbackResult?.channel || "failed"}`,
          parentType: "project",
          parentId: projectId,
          userId: user.id,
          userName: user.name || "Unknown",
        }),
      });
    } catch {
      // Activity logging is non-critical
    }

    return NextResponse.json({
      id: reviewRequest.id,
      token: reviewRequest.token,
      surveyUrl: buildSurveyUrl(reviewRequest.token),
      touchSent: touchResult.success ? 1 : (fallbackResult?.success ? 1 : 0),
      channel: touchResult.success ? touchResult.channel : fallbackResult?.channel,
      status: anySent ? "sent" : "failed",
      failureReason: !anySent ? touchResult.error : undefined,
      nextTouchAt: nextAt?.toISOString(),
    });
  } catch (error: any) {
    console.error("Review request POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
