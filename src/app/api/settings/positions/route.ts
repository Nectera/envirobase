import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { positions } = await req.json();
  await prisma.setting.upsert({
    where: { key: "positions" },
    data: { value: JSON.stringify(positions) },
  });
  return NextResponse.json(positions);
}
