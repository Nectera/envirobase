import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_PARTNERS = [
  "1-800-Water of Northern Colorado",
  "Action Restoration",
  "Adjuster Leads",
  "All Good Restoration",
  "All Pro Restoration",
  "Allen Service Plumbing",
  "Alliance Construction",
  "Banyan Environmental",
  "Belfor Environmental",
  "CleanPro Restoration",
  "E3C",
  "Phase Con",
  "Quest Environmental",
  "SilverKey",
];

export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: "referralPartners" } });
  const partners = setting?.value ? JSON.parse(setting.value) : DEFAULT_PARTNERS;
  return NextResponse.json(partners);
}

export async function PUT(req: NextRequest) {
  const result = await requireOrg();
  if (result instanceof NextResponse) return result;

  const { partners } = await req.json();
  await prisma.setting.upsert({
    where: { key: "referralPartners" },
    data: { value: JSON.stringify(partners) },
  });
  return NextResponse.json(partners);
}
