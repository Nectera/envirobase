import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { sendHtmlEmail, escapeHtml } from "@/lib/email";
import { COMPANY_SHORT, COMPANY_NAME, COMPANY_LOCATION, BRAND_COLOR } from "@/lib/branding";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/inventory/review
 * Get the review link details for a project's content inventory.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const review = await prisma.contentInventoryReview.findUnique({
      where: orgWhere(orgId, { projectId: params.id }),
    });

    return NextResponse.json(review || null);
  } catch (error: any) {
    console.error("Review GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/inventory/review
 * Create or get a review link for customer content inventory review.
 * Body: { customerName?, customerEmail? }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const userId = (session.user as any)?.id;

    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { customerName, customerEmail } = body;

    // Upsert review record
    const review = await prisma.contentInventoryReview.upsert({
      where: orgWhere(orgId, { projectId: params.id }),
      update: {
        customerName: customerName?.trim() || undefined,
        customerEmail: customerEmail?.trim() || undefined,
        sentAt: new Date(),
        sentBy: userId,
      },
      create: orgData(orgId, {
        projectId: params.id,
        customerName: customerName?.trim() || null,
        customerEmail: customerEmail?.trim() || null,
        sentAt: new Date(),
        sentBy: userId,
      }),
    });

    // If customer email provided, send the review link
    if (customerEmail?.trim()) {
      const project = await prisma.project.findUnique({
        where: orgWhere(orgId, { id: params.id }),
        select: { name: true },
      });

      const reviewUrl = `${process.env.NEXTAUTH_URL || "https://localhost:3000"}/review/${review.token}`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A2D;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${COMPANY_SHORT}</h1>
          <p style="margin:4px 0 0;color:${BRAND_COLOR};font-size:13px;">Content Inventory Review</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;font-weight:600;">Your Content Inventory is Ready for Review</h2>
          <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
            ${customerName ? `Hi ${escapeHtml(customerName)},<br><br>` : ""}
            The content inventory for <strong>${escapeHtml(project?.name || "your project")}</strong> is ready for your review.
            Please review each item and mark whether you'd like to <strong>Keep</strong> or <strong>Dispose</strong> of it.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:16px 0;">
              <a href="${reviewUrl}" style="display:inline-block;padding:14px 32px;background:#1B3A2D;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                Review Content Inventory
              </a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">
            Or copy this link: ${reviewUrl}
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

      await sendHtmlEmail({
        to: customerEmail.trim(),
        subject: `Xtract — Content Inventory Review for ${project?.name || "Your Project"}`,
        html,
        text: `Your content inventory is ready for review. Please visit: ${reviewUrl}`,
      }).catch((err: any) => console.error("Failed to send review email:", err));
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    console.error("Review POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/inventory/review
 * Update review settings. Body: { customerName?, customerEmail?, status? }
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const userId = (session.user as any)?.id;

    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const data: any = {};
    if (body.customerName !== undefined) data.customerName = body.customerName?.trim() || null;
    if (body.customerEmail !== undefined) data.customerEmail = body.customerEmail?.trim() || null;
    if (body.status !== undefined) data.status = body.status;

    const review = await prisma.contentInventoryReview.update({
      where: orgWhere(orgId, { projectId: params.id }),
      data,
    });

    return NextResponse.json(review);
  } catch (error: any) {
    console.error("Review PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
