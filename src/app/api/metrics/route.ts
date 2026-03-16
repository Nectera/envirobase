import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    const where: any = { ...orgWhere(orgId) };
    if (year) where.year = parseInt(year);

    const metrics = await prisma.metric.findMany({
      where,
      orderBy: { weekStartDate: "asc" },
    });

    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const metric = await prisma.metric.create({ data: orgData(orgId, body) });
    return NextResponse.json(metric);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
