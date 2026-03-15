import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCertRequirementsConfig } from "@/lib/cert-requirements";
import {
  sendNotificationToWorker,
  sendNotificationToRole,
  buildCertExpiryBody,
} from "@/lib/notifications";

/**
 * POST /api/cert-requirements/cron
 *
 * Daily cron job that scans all certifications for:
 *   1. Expired certs (expires < today) → update status, create critical alert
 *   2. Expiring soon certs (expires within threshold) → update status, create warning alert
 *
 * Sends in-app notifications to affected workers and all ADMIN/SUPERVISOR users.
 * Protected by CRON_SECRET header.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this automatically for cron jobs)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getCertRequirementsConfig();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Calculate threshold date for "expiring soon"
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + config.expiringThresholdDays);
    const thresholdStr = thresholdDate.toISOString().split("T")[0];

    // Fetch all certs that have an expiry date and include the worker
    const allCerts = await prisma.certification.findMany({
      where: {
        expires: { not: null },
      },
      include: { worker: true },
    });

    let expiredCount = 0;
    let expiringSoonCount = 0;
    let alertsCreated = 0;
    let notificationsSent = 0;

    for (const cert of allCerts) {
      if (!cert.expires) continue;

      const workerName = cert.worker?.name || "Unknown Worker";
      let newStatus: string | null = null;

      if (cert.expires < today) {
        // Cert is expired
        newStatus = "expired";
        expiredCount++;
      } else if (cert.expires <= thresholdStr) {
        // Cert is expiring soon
        newStatus = "expiring_soon";
        expiringSoonCount++;
      } else {
        // Cert is fine — make sure status is active
        if (cert.status !== "active") {
          await prisma.certification.update({
            where: { id: cert.id },
            data: { status: "active" },
          });
        }
        continue;
      }

      // Update cert status if changed
      if (cert.status !== newStatus) {
        await prisma.certification.update({
          where: { id: cert.id },
          data: { status: newStatus },
        });

        // Create alert (only on status CHANGE to avoid duplicates)
        const severity = newStatus === "expired" ? "critical" : "warning";
        const statusLabel = newStatus === "expired" ? "EXPIRED" : "EXPIRING SOON";

        // Check if an undismissed alert already exists for this cert
        const existingAlert = await prisma.alert.findFirst({
          where: {
            type: "certification",
            workerId: cert.workerId,
            title: { contains: cert.name },
            dismissed: false,
          },
        });

        if (!existingAlert) {
          await prisma.alert.create({
            data: {
              type: "certification",
              severity,
              title: `${cert.name} — ${statusLabel}`,
              message: `${workerName}'s ${cert.name} certification ${
                newStatus === "expired"
                  ? `expired on ${cert.expires}`
                  : `expires on ${cert.expires}`
              }. ${
                newStatus === "expired"
                  ? "Worker cannot be scheduled on jobs requiring this certification."
                  : "Please arrange renewal before expiration."
              }`,
              date: today,
              workerId: cert.workerId,
            },
          });
          alertsCreated++;
        }

        // Send notification to the worker
        const emailBody = buildCertExpiryBody(
          workerName,
          cert.name,
          cert.expires,
          newStatus as "expiring_soon" | "expired",
        );

        const subject =
          newStatus === "expired"
            ? `Certification Expired: ${cert.name}`
            : `Certification Expiring Soon: ${cert.name}`;

        const workerSent = await sendNotificationToWorker(
          cert.workerId,
          "certExpiring",
          subject,
          emailBody,
        );
        if (workerSent) notificationsSent++;

        // Also notify all ADMIN and SUPERVISOR users
        const adminSent = await sendNotificationToRole(
          "ADMIN",
          "certExpiring",
          subject,
          emailBody,
        );
        const supervisorSent = await sendNotificationToRole(
          "SUPERVISOR",
          "certExpiring",
          subject,
          emailBody,
        );
        notificationsSent += adminSent + supervisorSent;
      }
    }

    return NextResponse.json({
      success: true,
      processed: allCerts.length,
      expired: expiredCount,
      expiringSoon: expiringSoonCount,
      alertsCreated,
      notificationsSent,
    });
  } catch (error: any) {
    console.error("Cert cron error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
