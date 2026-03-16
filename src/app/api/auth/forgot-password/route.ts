import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendPasswordResetEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const RESET_RATE_LIMIT = { maxRequests: 3, windowSeconds: 60 };

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rl = checkRateLimit(`forgot-pwd:${ip}`, RESET_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const successResponse = NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });

    const user = await prisma.user.findFirst({
      where: { email: { equals: email.toLowerCase().trim(), mode: "insensitive" } },
      select: { id: true, email: true, organizationId: true, resetToken: true, resetTokenExpiry: true },
    });
    if (!user) {
      logger.info("Password reset requested for non-existent email", { email });
      return successResponse;
    }

    const rawToken = crypto.randomUUID();
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedToken, resetTokenExpiry: expiry },
    });

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    const result = await sendPasswordResetEmail(user.email, resetUrl, user.organizationId);

    if (result.success) {
      logger.audit("Password reset email sent", { userId: user.id, email: user.email });
    } else {
      logger.error("Failed to send password reset email", { email: user.email, error: result.error });
    }

    return successResponse;
  } catch (error: any) {
    logger.error("Forgot password error", { error: error.message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
