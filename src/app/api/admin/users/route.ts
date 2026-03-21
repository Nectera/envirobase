import { NextResponse, NextRequest } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { sendWelcomeEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["ADMIN", "PROJECT_MANAGER", "SUPERVISOR", "OFFICE", "TECHNICIAN"];

function isAdmin(role: string): boolean {
  return role === "ADMIN";
}

export async function GET() {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userRole = (session.user as any)?.role;
    if (!isAdmin(userRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const users = await prisma.user.findMany({
      where: orgWhere(orgId, {}),
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error: any) {
    logger.error("List users error", { error: error.message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id || "anonymous";
    if (!isAdmin(userRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rl = checkRateLimit(`admin-create:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { name, email, role } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const assignedRole = role && VALID_ROLES.includes(role) ? role : "TECHNICIAN";

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const tempPassword = crypto.randomBytes(4).toString("hex") + "A1!";
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const newUser = await prisma.user.create({
      data: {
        orgId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: assignedRole,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const emailResult = await sendWelcomeEmail(newUser.email, newUser.name, newUser.role, tempPassword, `${appUrl}/login`, orgId);

    logger.audit("User created by admin", {
      createdBy: userId, newUserId: newUser.id, email: newUser.email, role: newUser.role, welcomeEmailSent: emailResult.success,
    });

    return NextResponse.json(
      { user: newUser, welcomeEmailSent: emailResult.success, ...(emailResult.success ? {} : { emailError: emailResult.error }) },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error("Create user error", { error: error.message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
