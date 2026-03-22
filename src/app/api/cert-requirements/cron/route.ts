import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCertRequirementsConfig } from "@/lib/cert-requirements";
import {
  sendNotificationToWorker,
  sendNotificationToRole,
  buildCertExpiryBody,
  buildMedicalExpiryBody,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/cert-requirements/cron  (Vercel crons send GET)
 * POST also supported for manual triggers.
 *
 * Daily cron job that scans all certifications AND medical records for:
 *   1. Expired items → critical alert + email
 *   2. Expiring soon at configured intervals (30/14/7 days) → warning alert + email
 *
 * Uses the alertDays config (default [30, 14, 7]) to send escalating alerts
 * at each milestone rather than a single threshold.
 *
 * Also checks:
 *   - Respirator fit test dates (annual, alert at 30/14/7 days before 1-year mark)
 *   - Next medical exam dates
 *
 * Protected by CRON_SECRET header.
 */
async function handleCron(req: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this automatically for cron jobs)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getCertRequirementsConfig();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    // Sort alertDays descending so we check the largest window first
    const alertDays = [...config.alertDays].sort((a, b) => b - a);

    let stats = {
      certsProcessed: 0,
      expiredCount: 0,
      expiringSoonCount: 0,
      alertsCreated: 0,
      notificationsSent: 0,
      medicalProcessed: 0,
      medicalAlertsCreated: 0,
    };

    // ─── CERTIFICATION EXPIRY CHECK ──────────────────────────────────

    const allCerts = await prisma.certification.findMany({
      where: { expires: { not: null } },
      include: { worker: true },
    });

    stats.certsProcessed = allCerts.length;

    for (const cert of allCerts) {
      if (!cert.expires) continue;

      const workerName = cert.worker?.name || "Unknown Worker";
      const orgId = (cert.worker as any)?.organizationId || undefined;
      const expiresDate = new Date(cert.expires + "T00:00:00");
      const daysUntilExpiry = Math.ceil(
        (expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry < 0) {
        // ── EXPIRED ──
        stats.expiredCount++;

        if (cert.status !== "expired") {
          await prisma.certification.update({
            where: { id: cert.id },
            data: { status: "expired" },
          });
        }

        // Create alert if none exists
        const existingAlert = await prisma.alert.findFirst({
          where: {
            type: "certification",
            workerId: cert.workerId,
            title: { contains: cert.name },
            severity: "critical",
            dismissed: false,
          },
        });

        if (!existingAlert) {
          await prisma.alert.create({
            data: {
              type: "certification",
              severity: "critical",
              title: `${cert.name} — EXPIRED`,
              message: `${workerName}'s ${cert.name} certification expired on ${cert.expires}. Worker cannot be scheduled on jobs requiring this certification.`,
              date: todayStr,
              workerId: cert.workerId,
              organizationId: orgId,
            },
          });
          stats.alertsCreated++;

          // Notify worker + admin + supervisor + PM
          const emailBody = buildCertExpiryBody(workerName, cert.name, cert.expires, "expired");
          const subject = `Certification Expired: ${cert.name}`;
          stats.notificationsSent += await notifyCertStakeholders(cert.workerId, subject, emailBody);
        }
      } else {
        // ── CHECK EACH ALERT DAY INTERVAL ──
        // Find which alert day milestone we've hit (if any)
        const matchedDay = alertDays.find((d) => daysUntilExpiry <= d);

        if (matchedDay !== undefined) {
          stats.expiringSoonCount++;

          if (cert.status !== "expiring_soon") {
            await prisma.certification.update({
              where: { id: cert.id },
              data: { status: "expiring_soon" },
            });
          }

          // Create/escalate alert — use the day interval in the title to avoid duplicates per interval
          const alertTitle = `${cert.name} — Expires in ${daysUntilExpiry} days`;
          const existingAlert = await prisma.alert.findFirst({
            where: {
              type: "certification",
              workerId: cert.workerId,
              title: { contains: cert.name },
              dismissed: false,
            },
          });

          // Only create a new alert if:
          // 1. No existing alert, OR
          // 2. We've crossed into a new (smaller) alertDays threshold
          const shouldAlert = !existingAlert || isNewMilestone(existingAlert.title, daysUntilExpiry, alertDays);

          if (shouldAlert) {
            // Dismiss old alert if escalating
            if (existingAlert) {
              await prisma.alert.update({
                where: { id: existingAlert.id },
                data: { dismissed: true },
              });
            }

            await prisma.alert.create({
              data: {
                type: "certification",
                severity: daysUntilExpiry <= 7 ? "critical" : "warning",
                title: alertTitle,
                message: `${workerName}'s ${cert.name} certification expires on ${cert.expires} (${daysUntilExpiry} days). Please arrange renewal before expiration.`,
                date: todayStr,
                workerId: cert.workerId,
                organizationId: orgId,
              },
            });
            stats.alertsCreated++;

            const emailBody = buildCertExpiryBody(workerName, cert.name, cert.expires, "expiring_soon");
            const subject = `Certification Expiring in ${daysUntilExpiry} Days: ${cert.name}`;
            stats.notificationsSent += await notifyCertStakeholders(cert.workerId, subject, emailBody);
          }
        } else {
          // Cert is fine — ensure status is active
          if (cert.status !== "active") {
            await prisma.certification.update({
              where: { id: cert.id },
              data: { status: "active" },
            });
          }
        }
      }
    }

    // ─── MEDICAL RECORD EXPIRY CHECK ─────────────────────────────────
    // Check respirator fit tests (annual — 1 year from fitDate)
    // and nextExamDate for upcoming medical exams

    const allMedical = await prisma.medicalRecord.findMany({
      include: { worker: true },
    });

    stats.medicalProcessed = allMedical.length;

    for (const med of allMedical) {
      const workerName = med.worker?.name || "Unknown Worker";
      const orgId = (med.worker as any)?.organizationId || undefined;

      // Check respirator fit test (annual expiry = fitDate + 1 year)
      if (med.respiratorFitDate) {
        const fitDate = new Date(med.respiratorFitDate + "T00:00:00");
        const fitExpiry = new Date(fitDate);
        fitExpiry.setFullYear(fitExpiry.getFullYear() + 1);
        const fitExpiryStr = fitExpiry.toISOString().split("T")[0];
        const daysUntilFitExpiry = Math.ceil(
          (fitExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        await checkMedicalExpiry({
          workerId: med.workerId,
          workerName,
          itemName: "Respirator Fit Test",
          expiryStr: fitExpiryStr,
          daysUntilExpiry: daysUntilFitExpiry,
          alertDays,
          todayStr,
          stats,
          organizationId: orgId,
        });
      }

      // Check next medical exam date
      if (med.nextExamDate) {
        const daysUntilExam = Math.ceil(
          (new Date(med.nextExamDate + "T00:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        await checkMedicalExpiry({
          workerId: med.workerId,
          workerName,
          itemName: "Medical Exam",
          expiryStr: med.nextExamDate,
          daysUntilExpiry: daysUntilExam,
          alertDays,
          todayStr,
          stats,
          organizationId: orgId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      ...stats,
    });
  } catch (error: any) {
    console.error("Cert cron error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// Vercel crons send GET
export async function GET(req: NextRequest) {
  return handleCron(req);
}

// Keep POST for manual triggers
export async function POST(req: NextRequest) {
  return handleCron(req);
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Send cert expiry notifications to worker + admin + supervisor + PM */
async function notifyCertStakeholders(
  workerId: string,
  subject: string,
  emailBody: string,
): Promise<number> {
  let sent = 0;
  const workerSent = await sendNotificationToWorker(workerId, "certExpiring", subject, emailBody);
  if (workerSent) sent++;
  sent += await sendNotificationToRole("ADMIN", "certExpiring", subject, emailBody);
  sent += await sendNotificationToRole("SUPERVISOR", "certExpiring", subject, emailBody);
  sent += await sendNotificationToRole("PROJECT_MANAGER", "certExpiring", subject, emailBody);
  return sent;
}

/** Check if we've crossed into a new alertDays milestone compared to the existing alert */
function isNewMilestone(existingTitle: string, currentDays: number, alertDays: number[]): boolean {
  // Extract the day number from existing alert title like "... — Expires in 28 days"
  const match = existingTitle.match(/(\d+)\s*days/);
  if (!match) return true;

  const previousDays = parseInt(match[1]);

  // Find which milestone bucket each falls into
  const previousBucket = alertDays.find((d) => previousDays <= d) ?? Infinity;
  const currentBucket = alertDays.find((d) => currentDays <= d) ?? Infinity;

  // If the bucket changed (we crossed a threshold), it's a new milestone
  return currentBucket < previousBucket;
}

/** Check a medical record expiry date and create alerts/notifications as needed */
async function checkMedicalExpiry({
  workerId,
  workerName,
  itemName,
  expiryStr,
  daysUntilExpiry,
  alertDays,
  todayStr,
  stats,
  organizationId,
}: {
  workerId: string;
  workerName: string;
  itemName: string;
  expiryStr: string;
  daysUntilExpiry: number;
  alertDays: number[];
  todayStr: string;
  stats: { medicalAlertsCreated: number; notificationsSent: number };
  organizationId?: string;
}) {
  const isExpired = daysUntilExpiry < 0;
  const matchedDay = isExpired ? undefined : alertDays.find((d) => daysUntilExpiry <= d);

  if (!isExpired && matchedDay === undefined) return; // Not yet in any alert window

  const severity = isExpired || daysUntilExpiry <= 7 ? "critical" : "warning";
  const statusLabel = isExpired ? "OVERDUE" : `Due in ${daysUntilExpiry} days`;
  const alertTitle = `${itemName} — ${statusLabel}`;

  // Check for existing undismissed alert
  const existingAlert = await prisma.alert.findFirst({
    where: {
      type: "medical",
      workerId,
      title: { contains: itemName },
      dismissed: false,
    },
  });

  const shouldAlert = !existingAlert ||
    (isExpired && existingAlert.severity !== "critical") ||
    (!isExpired && isNewMilestone(existingAlert.title || "", daysUntilExpiry, alertDays));

  if (shouldAlert) {
    // Dismiss old alert if escalating
    if (existingAlert) {
      await prisma.alert.update({
        where: { id: existingAlert.id },
        data: { dismissed: true },
      });
    }

    await prisma.alert.create({
      data: {
        type: "medical",
        severity,
        title: alertTitle,
        message: `${workerName}'s ${itemName} ${
          isExpired ? `was due on ${expiryStr} and is now overdue` : `is due on ${expiryStr} (${daysUntilExpiry} days)`
        }. ${isExpired ? "Schedule immediately." : "Please schedule before the due date."}`,
        date: todayStr,
        workerId,
        organizationId,
      },
    });
    stats.medicalAlertsCreated++;

    // Send notifications
    const emailBody = buildMedicalExpiryBody(
      workerName,
      itemName,
      expiryStr,
      isExpired ? "overdue" : "upcoming",
      daysUntilExpiry,
    );
    const subject = isExpired
      ? `${itemName} Overdue: ${workerName}`
      : `${itemName} Due in ${daysUntilExpiry} Days: ${workerName}`;

    stats.notificationsSent += await notifyCertStakeholders(workerId, subject, emailBody);
  }
}
