import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { rcApiCall, isConnected, getValidToken } from "@/lib/ringcentral";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Validate phone number format
function validatePhoneNumber(phoneNumber: string): boolean {
  // Remove common separators and whitespace
  const cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, "");
  // Must be 10-15 digits
  return /^\d{10,15}$/.test(cleaned);
}

// Validate message length (SMS has size limits)
function validateMessageLength(text: string): boolean {
  // Max 1600 characters for long SMS (multi-part)
  return text.length > 0 && text.length <= 1600;
}

export async function POST(request: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session } = auth;
  if (!session?.user?.email) {
    logger.warn("Unauthorized SMS send attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await isConnected())) {
      return NextResponse.json({ error: "RingCentral not connected" }, { status: 503 });
    }

    const body = await request.json();
    const { to, text, parentType, parentId, contactName } = body;

    if (!to || !text) {
      return NextResponse.json(
        { error: "Phone number (to) and message (text) are required" },
        { status: 400 }
      );
    }

    // Validate phone number format
    if (!validatePhoneNumber(to)) {
      logger.warn("Invalid phone number format", {
        userId: session.user.email,
        phoneNumber: to,
      });
      return NextResponse.json(
        { error: "Invalid phone number format. Must be 10-15 digits." },
        { status: 400 }
      );
    }

    // Validate message length
    if (!validateMessageLength(text)) {
      logger.warn("SMS message exceeds maximum length", {
        userId: session.user.email,
        length: text.length,
      });
      return NextResponse.json(
        { error: "Message too long. Maximum 1600 characters allowed." },
        { status: 400 }
      );
    }

    // Check rate limit: 10 SMS per minute per session
    const rateLimitKey = `sms:${session.user.email}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, {
      maxRequests: 10,
      windowSeconds: 60,
    });

    if (!rateLimitResult.allowed) {
      logger.warn("SMS rate limit exceeded", {
        userId: session.user.email,
        resetAt: new Date(rateLimitResult.resetAt).toISOString(),
      });
      return NextResponse.json(
        {
          error: "Too many SMS requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        { status: 429, headers: { "Retry-After": `${Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)}` } }
      );
    }

    const auth = await getValidToken();
    if (!auth) {
      logger.warn("RingCentral authentication expired", {
        userId: session.user.email,
      });
      return NextResponse.json({ error: "RingCentral authentication expired" }, { status: 401 });
    }

    if (!auth.phoneNumber) {
      return NextResponse.json({ error: "No SMS-capable phone number configured" }, { status: 400 });
    }

    // Send SMS
    const smsBody = {
      from: { phoneNumber: auth.phoneNumber },
      to: [{ phoneNumber: to }],
      text,
    };

    const smsResult = await rcApiCall("POST", "/account/~/extension/~/sms", smsBody);

    // Log to activity feed
    if (parentType && parentId) {
      await prisma.activity.create({
        data: {
          parentType,
          parentId,
          type: "sms",
          title: `SMS to ${contactName || to}`,
          description: `SMS sent to ${to}${contactName ? ` (${contactName})` : ""}: ${text}`,
          createdBy: "system",
        },
      });
    }

    // Audit log
    logger.audit("sms_sent", {
      userId: session.user.email,
      to,
      messageId: smsResult.id,
      messageLength: text.length,
    });

    return NextResponse.json({
      success: true,
      messageId: smsResult.id,
    });
  } catch (error: any) {
    logger.error("SMS send error", {
      userId: session.user?.email,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
