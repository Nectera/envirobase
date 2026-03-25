import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rcApiCall } from "@/lib/ringcentral";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Normalize phone number for comparison — strip +1 prefix, spaces, dashes
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\.\+]/g, "");
  // Remove leading 1 for US numbers if 11 digits
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return cleaned.slice(1);
  }
  return cleaned;
}

// Look up entity (lead, contact, company) by phone number
async function findEntityByPhone(phoneNumber: string): Promise<{
  parentType: string;
  parentId: string;
  entityName: string;
} | null> {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized || normalized.length < 7) return null;

  // Search pattern — check last 10 digits
  const last10 = normalized.slice(-10);

  // Check leads first (most common)
  const lead = await prisma.lead.findFirst({
    where: {
      phone: { contains: last10 },
    },
    select: { id: true, firstName: true, lastName: true, phone: true },
  });
  if (lead) {
    return {
      parentType: "lead",
      parentId: lead.id,
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
    where: {
      phone: { contains: last10 },
    },
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
  // Notify all users (we don't have a specific assignment model for SMS)
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
        // Look up who sent this
        const entity = await findEntityByPhone(fromNumber);

        // Store the message
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

        // Also create an Activity record so it shows in the activity feed
        const smsActivityContent = `Inbound SMS from ${entity?.entityName || fromNumber} (${fromNumber}): ${messageText}`;
        if (entity) {
          await prisma.activity.create({
            data: {
              parentType: entity.parentType,
              parentId: entity.parentId,
              type: "sms",
              content: smsActivityContent,
              user: "RingCentral",
            },
          });
        }

        // Create notification
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

    // ─── Call Recording ─────────────────────────────────────────
    if (event.includes("/call-log") || event.includes("/telephony/sessions")) {
      const recording = eventBody.recording || null;
      const result = eventBody.result || eventBody;
      const callDirection = result.direction?.toLowerCase() || "";
      const callDuration = result.duration || 0;

      // Determine the external phone number
      const externalNumber =
        callDirection === "inbound"
          ? result.from?.phoneNumber || ""
          : result.to?.phoneNumber || result.to?.[0]?.phoneNumber || "";

      if (externalNumber) {
        const entity = await findEntityByPhone(externalNumber);

        // Build activity content
        const durationMin = Math.ceil(callDuration / 60);
        const callerName = entity?.entityName || externalNumber;
        let content = `${callDirection === "inbound" ? "Inbound" : "Outbound"} call with ${callerName} (${externalNumber})`;
        if (callDuration > 0) {
          content += ` — ${durationMin} min`;
        }

        // Add recording URL if available
        let recordingUrl: string | null = null;
        if (recording?.id) {
          try {
            const recData = await rcApiCall(
              "GET",
              `/account/~/recording/${recording.id}`
            );
            recordingUrl = recData?.contentUri || null;
          } catch {
            // Recording fetch may fail, that's ok
          }
        }

        if (recordingUrl) {
          content += `\nRecording: ${recordingUrl}`;
        }

        // Log as activity — always create, even if no entity match
        await prisma.activity.create({
          data: {
            parentType: entity?.parentType || null,
            parentId: entity?.parentId || null,
            type: "call",
            content,
            user: "RingCentral",
          },
        });

        logger.info("Call activity logged", {
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
