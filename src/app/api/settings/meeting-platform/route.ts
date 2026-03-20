import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SETTING_KEY = "meetingPlatform";
const VALID_PLATFORMS = ["google_meet", "zoom", "disabled"];

export async function GET() {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  try {
    const key = `${SETTING_KEY}_${orgId}`;
    const setting = await prisma.setting.findUnique({
      where: { key },
    });
    return NextResponse.json({ platform: setting?.value || "google_meet" });
  } catch {
    return NextResponse.json({ platform: "google_meet" });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  try {
    const body = await req.json();
    const platform = body.platform;

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // Use the org-scoped key to avoid collision across orgs
    const key = `${SETTING_KEY}_${orgId}`;
    await prisma.setting.upsert({
      where: { key },
      update: { value: platform },
      create: orgData(orgId, { key, value: platform }),
    });

    return NextResponse.json({ platform });
  } catch (error: any) {
    console.error("Meeting platform setting error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
