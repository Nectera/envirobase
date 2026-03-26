import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Normalize phone number for comparison — strip +1 prefix, spaces, dashes
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\.\+]/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return cleaned.slice(1);
  }
  return cleaned;
}

// Format phone for display: (303) 555-1234
function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// Look up entity (lead, contact, company) by phone number
async function findEntityByPhone(phoneNumber: string): Promise<{
  parentType: string;
  parentId: string;
  entityName: string;
  leadId?: string;
} | null> {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized || normalized.length < 7) return null;

  const last10 = normalized.slice(-10);

  // Check leads first (most common)
  const lead = await prisma.lead.findFirst({
    where: { phone: { contains: last10 } },
    select: { id: true, firstName: true, lastName: true, phone: true },
  });
  if (lead) {
    return {
      parentType: "lead",
      parentId: lead.id,
      leadId: lead.id,
      entityName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown Lead",
    };
  }

  // Check contacts
  const contact = await prisma.contact.findFirst({
    where: {
      OR: [
        { phone: { contains: last10 } },
        { mobile: { contains: last10 } },
      ],
    },
    select: { id: true, firstName: true, lastName: true },
  });
  if (contact) {
    return {
      parentType: "contact",
      parentId: contact.id,
      entityName: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unknown Contact",
    };
  }

  // Check companies
  const company = await prisma.company.findFirst({
    where: { phone: { contains: last10 } },
    select: { id: true, name: true },
  });
  if (company) {
    return {
      parentType: "company",
      parentId: company.id,
      entityName: company.name || "Unknown Company",
    };
  }

  return null;
}

// Create a notification for incoming SMS
async function createSmsNotification(
  fromNumber: string,
  entityName: string,
  parentType: string,
  parentId: string,
  messagePreview: string
) {
  const users = await prisma.user.findMany({
    select: { id: true },
    take: 20,
  });

  const truncated = messagePreview.length > 80 ? messagePreview.slice(0, 80) + "..." : messagePreview;

  for (const user of users) {
    await prisma.notification.create({
      data: {
        type: "sms_inbound",
        title: `New SMS from ${entityName || fromNumber}`,
        message: truncated,
        link: `/${parentType}s/${parentId}`,
        userId: user.id,
        fromName: entityName || fromNumber,
      },
    });
  }
}

// Create call activity with structured metadata
async function createCallActivity(opts: {
  direction: string;
  entityName: string;
  externalNumber: string;
  duration: number;
  sessionId?: string;
  fromNumber: string;
  toNumber: string;
  entity: { parentType: string; parentId: string; leadId?: string } | null;
  recordingUrl?: string | null;
  startTime?: string | null;
}) {
  const { direction, entityName, externalNumber, duration, sessionId, fromNumber, toNumber, entity, recordingUrl, startTime } = opts;
  const durationMin = Math.ceil(duration / 60);
  const dirLabel = direction === "inbound" ? "Inbound" : "Outbound";

  let content = `${dirLabel} call with ${entityName} (${formatPhoneDisplay(externalNumber)})`;
  if (duration > 0) {
    content += ` — ${durationMin} min`;
  }
  if (recordingUrl) {
    content += `\n🎙️ Recording: ${recordingUrl}`;
  }

  const metadata: Record<string, any> = {
    direction,
    duration, // seconds
    fromNumber,
    toNumber,
    sessionId: sessionId || null,
    recordingUrl: recordingUrl || null,
    startTime: startTime || new Date().toISOString(),
  };

  const activity = await prisma.activity.create({
    data: {
      parentType: entity?.parentType || null,
      parentId: entity?.parentId || null,
      leadId: entity?.leadId || null,
      type: "call",
      content,
      user: "RingCentral",
      metadata,
    },
  });

  return activity;
}

// GET /api/ringcentral/webhook — debug: check recent RC activities
export async function GET(request: NextRequest) {
  try {
    const recentActivities = await prisma.activity.findMany({
      where: { user: "RingCentral" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return NextResponse.json({
      message: "Webhook endpoint is active",
      recentRCActivities: recentActivities.length,
      activities: recentActivities.map((a: any) => ({
        id: a.id,
        type: a.type,
        parentType: a.parentType,
        parentId: a.parentId,
        content: (a.content || "").slice(0, 100),
        metadata: a.metadata,
        createdAt: a.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/ringcentral/webhook — receives events from RingCentral
export async function POST(request: NextRequest) {
  try {
    // RingCentral sends a validation token on subscription creation
    const validationToken = request.headers.get("Validation-Token");
    if (validationToken) {
      return new NextResponse(null, {
        status: 200,
        headers: { "Validation-Token": validationToken },
      });
    }

    const body = await request.json();
    const event = body?.event || "";
    const eventBody = body?.body || {};

    logger.info("RC webhook received", { event, uuid: body?.uuid });

    // ─── Inbound SMS ────────────────────────────────────────────
    if (event.includes("/message-store") && eventBody.type === "SMS") {
      const direction = eventBody.direction?.toLowerCase();
      const fromNumber = eventBody.from?.phoneNumber || "";
      const toNumber = eventBody.to?.[0]?.phoneNumber || "";
      const messageText = eventBody.subject || "";
      const rcMessageId = eventBody.id ? String(eventBody.id) : null;

      if (direction === "inbound" && fromNumber && messageText) {
        const entity = await findEntityByPhone(fromNumber);

        await prisma.smsMessage.create({
          data: {
            direction: "inbound",
            fromNumber,
            toNumber,
            body: messageText,
            rcMessageId,
            status: "received",
            parentType: entity?.parentType || null,
            parentId: entity?.parentId || null,
            senderName: entity?.entityName || fromNumber,
          },
        });

        const smsActivityContent = `Inbound SMS from ${entity?.entityName || fromNumber} (${formatPhoneDisplay(fromNumber)}): ${messageText}`;
        if (entity) {
          await prisma.activity.create({
            data: {
              parentType: entity.parentType,
              parentId: entity.parentId,
              leadId: entity.leadId || null,
              type: "sms",
              content: smsActivityContent,
              user: "RingCentral",
              metadata: {
                direction: "inbound",
                fromNumber,
                toNumber,
              },
            },
          });
        }

        if (entity) {
          await createSmsNotification(
            fromNumber,
            entity.entityName,
            entity.parentType,
            entity.parentId,
            messageText
          );
        }

        logger.info("Inbound SMS stored", {
          from: fromNumber,
          entity: entity?.parentType,
          entityId: entity?.parentId,
        });
      }
    }

    // ─── Telephony Sessions (real-time call events) ────────────
    if (event.includes("/telephony/sessions")) {
      const parties = eventBody.parties || [];
      const party = parties[0];

      if (party) {
        const partyStatus = party.status?.code?.toLowerCase() || "";
        const callDirection = (party.direction || "").toLowerCase();
        const fromNumber = party.from?.phoneNumber || "";
        const toNumber = party.to?.phoneNumber || "";

        logger.info("RC telephony session event", {
          status: partyStatus,
          direction: callDirection,
          from: fromNumber,
          to: toNumber,
          sessionId: eventBody.telephonySessionId,
        });

        // Only process when the call is completed
        if (partyStatus === "disconnected") {
          const externalNumber = callDirection === "inbound" ? fromNumber : toNumber;

          if (externalNumber) {
            const entity = await findEntityByPhone(externalNumber);
            const callerName = entity?.entityName || formatPhoneDisplay(externalNumber);
            const duration = party.duration || 0;
            const sessionId = eventBody.telephonySessionId || eventBody.sessionId;

            const createdActivity = await createCallActivity({
              direction: callDirection,
              entityName: callerName,
              externalNumber,
              duration,
              sessionId,
              fromNumber,
              toNumber,
              entity,
              startTime: eventBody.creationTime || null,
            });

            logger.info("Call activity logged (telephony session)", {
              direction: callDirection,
              duration,
              entity: entity?.parentType || "unmatched",
              entityId: entity?.parentId || null,
            });

            // Recording isn't available at disconnect time — the backfill-recordings
            // endpoint will pick it up when the activity feed loads (or via cron)
          }
        }
      }
    }

    // ─── Call Log (fallback event format) ─────────────────────
    if (event.includes("/call-log") && !event.includes("/telephony/sessions")) {
      const recording = eventBody.recording || null;
      const result = eventBody.result || eventBody;
      const callDirection = (result.direction || "").toLowerCase();
      const callDuration = result.duration || 0;

      const externalNumber =
        callDirection === "inbound"
          ? result.from?.phoneNumber || ""
          : result.to?.phoneNumber || result.to?.[0]?.phoneNumber || "";

      if (externalNumber) {
        const entity = await findEntityByPhone(externalNumber);
        const callerName = entity?.entityName || formatPhoneDisplay(externalNumber);

        let recordingUrl: string | null = null;
        if (recording?.id) {
          // Use our proxy endpoint so the browser can play without RC auth token
          recordingUrl = `/api/ringcentral/recording/${recording.id}`;
        }

        await createCallActivity({
          direction: callDirection,
          entityName: callerName,
          externalNumber,
          duration: callDuration,
          sessionId: result.sessionId || null,
          fromNumber: result.from?.phoneNumber || "",
          toNumber: result.to?.phoneNumber || result.to?.[0]?.phoneNumber || "",
          entity,
          recordingUrl,
          startTime: result.startTime || null,
        });

        logger.info("Call activity logged (call-log)", {
          direction: callDirection,
          entity: entity?.parentType || "unmatched",
          entityId: entity?.parentId || null,
          hasRecording: !!recordingUrl,
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    logger.error("RC webhook error", { error: error.message, stack: error.stack });
    // Always return 200 to RingCentral so it doesn't retry indefinitely
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
