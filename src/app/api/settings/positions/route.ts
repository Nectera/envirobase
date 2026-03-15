import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — List all positions
export async function GET() {
  const settings = await prisma.setting.findUnique({ where: { key: "positions" } });
  const positions: string[] = settings?.value ? JSON.parse(settings.value) : [
    "Supervisor", "Technician", "Laborer", "Project Manager", "Office Admin", "Office Manager", "Project Coordinator", "Desk Estimator", "Field Estimator",
  ];
  return NextResponse.json(positions);
}

// PUT — Save positions list
export async function PUT(req: NextRequest) {
  const result = await requireOrg();
  if (result instanceof NextResponse) return result;

  const { positions } = await req.json();
  await prisma.setting.upsert({
    where: { key: "positions" },
    data: { value: JSON.stringify(positions) },
  });
  return NextResponse.json(positions);
}
