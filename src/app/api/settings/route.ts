import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const settings = await prisma.setting.findMany({ where: orgWhere(orgId) });
  const settingsObj: Record<string, string> = {};
  settings.forEach((s: any) => {
    settingsObj[s.key] = s.value;
  });
  return NextResponse.json(settingsObj);
}

export async function PUT(req: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session, orgId } = auth;

  // Only ADMIN can modify settings
  const userRole = (session.user as any)?.role;
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Upsert each setting
  for (const [key, value] of Object.entries(body)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: orgData(orgId, { key, value: String(value) }),
    });
  }

  // Return all updated settings
  const settings = await prisma.setting.findMany({ where: orgWhere(orgId) });
  const settingsObj: Record<string, string> = {};
  settings.forEach((s: any) => {
    settingsObj[s.key] = s.value;
  });
  return NextResponse.json(settingsObj);
}
