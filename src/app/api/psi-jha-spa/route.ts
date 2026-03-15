import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const where: any = {};
    if (projectId) where.projectId = projectId;
    const rawItems = await prisma.psiJhaSpa.findMany({ where, include: { project: true } });
    // Flatten data JSON fields onto each item for frontend compatibility
    const items = rawItems.map((r: any) => ({
      ...r,
      ...(r.data && typeof r.data === "object" ? r.data : {}),
    }));
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    // Extract core fields; store everything else in data JSON
    const { projectId, date, status, ...extraFields } = body;

    const item = await prisma.psiJhaSpa.create({
      data: {
        projectId,
        date: date || new Date().toISOString().split("T")[0],
        status: status || "draft",
        data: Object.keys(extraFields).length > 0 ? extraFields : null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error("PSI/JHA/SPA creation error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
