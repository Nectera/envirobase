import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session } = result;
    if (!session?.user?.email) {
      logger.warn("Unauthorized email send attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit: 10 emails per minute per session
    const rateLimitKey = `email:${session.user.email}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, {
      maxRequests: 10,
      windowSeconds: 60,
    });

    if (!rateLimitResult.allowed) {
      logger.warn("Email rate limit exceeded", {
        userId: session.user.email,
        resetAt: new Date(rateLimitResult.resetAt).toISOString(),
      });
      return NextResponse.json(
        {
          error: "Too many email requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        { status: 429, headers: { "Retry-After": `${Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)}` } }
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: "Email not configured. Add SMTP credentials to .env.local" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { to, subject, body: emailBody, cc, parentType, parentId } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      );
    }

    // Send the email
    const result = await sendEmail({
      to,
      subject,
      body: emailBody,
      cc: cc || undefined,
    });

    if (!result.success) {
      logger.error("Failed to send email", {
        to,
        subject,
        error: result.error,
        userId: session.user.email,
      });
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    // Log to activity feed if parentType/parentId provided
    if (parentType && parentId) {
      await prisma.activity.create({
        data: {
          parentType,
          parentId,
          type: "email",
          title: `Email: ${subject}`,
          description: `Sent to ${to}${cc ? ` (CC: ${cc})` : ""}\n\nSubject: ${subject}\n\n${emailBody}`,
          createdBy: "system",
        },
      });
    }

    // Audit log
    logger.audit("email_sent", {
      userId: session.user.email,
      to,
      subject,
      messageId: result.messageId,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error: any) {
    logger.error("Email send error", {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Check if email is configured
export async function GET() {
  return NextResponse.json({
    configured: isEmailConfigured(),
    sender: process.env.SMTP_USER || null,
  });
}
