import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SETTING_KEY_PREFIX = "offices";

export async function GET() {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  try {
    const key = `${SETTING_KEY_PREFIX}_${orgId}`;
    const setting = await prisma.setting.findUnique({ where: { key } });
    const offices: { value: string; label: string }[] = setting?.value
      ? JSON.parse(setting.value)
      : [];
    return NextResponse.json({ offices });
  } catch {
    return NextResponse.json({ offices: [] });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  try {
    const body = await req.json();
    const offices = body.offices; // [{ value: "slug", label: "Display Name" }, ...]

    if (!Array.isArray(offices)) {
      return NextResponse.json({ error: "offices must be an array" }, { status: 400 });
    }

    const key = `${SETTING_KEY_PREFIX}_${orgId}`;
    await prisma.setting.upsert({
      where: { key },
      update: { value: JSON.stringify(offices) },
      create: orgData(orgId, { key, value: JSON.stringify(offices) }),
    });

    return NextResponse.json({ offices });
  } catch (error: any) {
    console.error("Offices setting error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
