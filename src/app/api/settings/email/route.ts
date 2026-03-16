import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import prisma from "@/lib/prisma";
import { testSmtpConnection } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/email — Get org SMTP settings (passwords masked)
 */
export async function GET() {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session, orgId } = auth;

  if (!orgId) {
    return NextResponse.json({ error: "Organization required" }, { status: 400 });
  }

  // Only admins can view email settings
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const org = await (prisma as any).organization.findUnique({
      where: { id: orgId },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPassword: true,
        smtpFromName: true,
        smtpFromEmail: true,
        smtpSecure: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Mask the password
    return NextResponse.json({
      smtpHost: org.smtpHost || "",
      smtpPort: org.smtpPort || 587,
      smtpUser: org.smtpUser || "",
      smtpPassword: org.smtpPassword ? "••••••••" : "",
      smtpFromName: org.smtpFromName || "",
      smtpFromEmail: org.smtpFromEmail || "",
      smtpSecure: org.smtpSecure || false,
      configured: !!(org.smtpHost && org.smtpUser && org.smtpPassword),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/settings/email — Update org SMTP settings
 */
export async function PUT(req: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session, orgId } = auth;

  if (!orgId) {
    return NextResponse.json({ error: "Organization required" }, { status: 400 });
  }

  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpFromName,
      smtpFromEmail,
      smtpSecure,
    } = body;

    // Build update data — only include password if it's not masked
    const updateData: any = {
      smtpHost: smtpHost || null,
      smtpPort: smtpPort ? parseInt(smtpPort) : 587,
      smtpUser: smtpUser || null,
      smtpFromName: smtpFromName || null,
      smtpFromEmail: smtpFromEmail || null,
      smtpSecure: smtpSecure || false,
    };

    // Only update password if a new one was provided (not the masked value)
    if (smtpPassword && smtpPassword !== "••••••••") {
      updateData.smtpPassword = smtpPassword;
    }

    const org = await (prisma as any).organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      configured: !!(org.smtpHost && org.smtpUser && org.smtpPassword),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/settings/email — Test SMTP connection
 */
export async function POST(req: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session, orgId } = auth;

  if (!orgId) {
    return NextResponse.json({ error: "Organization required" }, { status: 400 });
  }

  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    let { smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure } = body;

    // If password is masked, fetch the stored one
    if (smtpPassword === "••••••••") {
      const org = await (prisma as any).organization.findUnique({
        where: { id: orgId },
        select: { smtpPassword: true },
      });
      smtpPassword = org?.smtpPassword;
    }

    if (!smtpHost || !smtpUser || !smtpPassword) {
      return NextResponse.json({
        success: false,
        error: "SMTP host, user, and password are required",
      }, { status: 400 });
    }

    const result = await testSmtpConnection({
      host: smtpHost,
      port: parseInt(smtpPort || "587"),
      secure: smtpSecure || false,
      user: smtpUser,
      password: smtpPassword,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
