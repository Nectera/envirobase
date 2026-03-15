import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { sendWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const email = body.email?.toLowerCase().trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Find the worker
    const worker = await prisma.worker.findUnique({ where: orgWhere(orgId, { id: params.id }) });
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    // Check if worker already has a user account
    if (worker.userId) {
      return NextResponse.json({ error: "This worker already has a login account" }, { status: 400 });
    }

    // Check if email is already in use by an existing user
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (existingUser) {
      // Unlink any other worker that might be pointing to this user
      await prisma.worker.updateMany({
        where: { userId: existingUser.id },
        data: { userId: null },
      });

      // Update password, name, and role to match worker, then link
      const passwordHash = await hash(password, 12);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash, name: worker.name, role: worker.role || "TECHNICIAN" },
      });

      await prisma.worker.update({
        where: { id: params.id },
        data: { userId: existingUser.id },
      });

      // Send welcome email (non-blocking)
      const loginUrl = `${process.env.NEXTAUTH_URL || "https://localhost:3000"}/login`;
      sendWelcomeEmail(email, worker.name, worker.role || "TECHNICIAN", password, loginUrl).catch(() => {});

      return NextResponse.json({ success: true, userId: existingUser.id, email, linked: true }, { status: 200 });
    }

    // No existing user — create a new one
    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: worker.name,
        role: worker.role || "TECHNICIAN",
      },
    });

    // Link worker to user
    await prisma.worker.update({
      where: { id: params.id },
      data: { userId: user.id },
    });

    // Send welcome email (non-blocking)
    const loginUrl = `${process.env.NEXTAUTH_URL || "https://localhost:3000"}/login`;
    sendWelcomeEmail(email, worker.name, worker.role || "TECHNICIAN", password, loginUrl).catch(() => {});

    return NextResponse.json({ success: true, userId: user.id, email }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
