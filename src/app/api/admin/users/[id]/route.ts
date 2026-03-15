import { NextResponse, NextRequest } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { hash } from "bcryptjs";

const VALID_ROLES = ["ADMIN", "SUPERVISOR", "OFFICE", "TECHNICIAN"];

function isAdmin(role: string): boolean {
  return role === "ADMIN" || role === "SUPERVISOR";
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userRole = (session.user as any)?.role;
    const currentUserId = (session.user as any)?.id;
    if (!isAdmin(userRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = params;
    const body = await req.json();
    const { name, email, role, password } = body;

    // Prevent non-admins from changing their own role or demoting other admins
    if (id === currentUserId && role && role !== userRole) {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: orgWhere(orgId, { id }),
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if email is being changed and if new email already exists
    if (email && email.toLowerCase().trim() !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (emailTaken) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (role && VALID_ROLES.includes(role)) updateData.role = role;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      updateData.passwordHash = await hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: orgWhere(orgId, { id }),
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    logger.audit("User updated by admin", {
      updatedBy: currentUserId,
      targetUserId: id,
      changes: Object.keys(updateData),
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    logger.error("Update user error", { error: error.message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userRole = (session.user as any)?.role;
    const currentUserId = (session.user as any)?.id;
    if (!isAdmin(userRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = params;

    // Prevent self-deletion
    if (id === currentUserId) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: orgWhere(orgId, { id }),
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({ where: orgWhere(orgId, { id }) });

    logger.audit("User deleted by admin", {
      deletedBy: currentUserId,
      targetUserId: id,
      email: existingUser.email,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Delete user error", { error: error.message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
