import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { sendNotificationToRole } from "@/lib/notifications";
import { escapeHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/time-clock/[id]/overtime-alert
 *
 * Called when a worker confirms overtime on clock-out.
 * Flags the time entry and notifies ADMIN users (GM + payroll) for approval.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    const body = await req.json();
    const { hours, maxHours, projectName, workerName } = body;

    // Flag the time entry as overtime requiring review
    await prisma.timeEntry.update({
      where: { id: params.id },
      data: {
        overtime: true,
        approvalStatus: "flagged",
        flagReason: `Overtime: ${hours}h worked (expected max ${maxHours}h). Worker confirmed at clock-out.`,
      },
    });

    // Build notification email body
    const emailBody = `
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
        <strong>${escapeHtml(workerName)}</strong> clocked out with overtime hours that need approval.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;margin:0 0 16px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 8px;color:#92400e;font-size:13px;font-weight:600;">Overtime Details</p>
          <p style="margin:0 0 4px;color:#1e293b;font-size:14px;">Worker: <strong>${escapeHtml(workerName)}</strong></p>
          <p style="margin:0 0 4px;color:#1e293b;font-size:14px;">Project: <strong>${escapeHtml(projectName)}</strong></p>
          <p style="margin:0 0 4px;color:#1e293b;font-size:14px;">Hours Worked: <strong>${hours}h</strong></p>
          <p style="margin:0;color:#1e293b;font-size:14px;">Expected Max: <strong>${maxHours}h</strong></p>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;color:#475569;font-size:13px;">
        Please review and approve or adjust this time entry in the payroll report.
      </p>
    `;

    // Notify all ADMIN users (GM + payroll)
    const sentCount = await sendNotificationToRole(
      "ADMIN",
      "noteMention", // Reuse noteMention type since there's no dedicated OT type
      `Overtime Alert: ${workerName} — ${hours}h on ${projectName}`,
      emailBody,
    );

    // Also create in-app notifications for admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      try {
        await prisma.notification.create({
          data: {
            type: "overtime",
            title: "Overtime Requires Approval",
            message: `${workerName} worked ${hours}h on ${projectName} (max ${maxHours}h)`,
            link: "/time-clock/payroll",
            userId: admin.id,
            fromUserId: (session.user as any).id,
            fromName: workerName,
          },
        });
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({ success: true, notified: sentCount });
  } catch (error: any) {
    console.error("Overtime alert error:", error?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
