import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const templates = await prisma.taskTemplate.findMany({
      where: orgWhere(orgId),
    });
    return NextResponse.json(templates);
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

    if (!body.name || !body.tasks || !Array.isArray(body.tasks)) {
      return NextResponse.json({ error: "name and tasks array are required" }, { status: 400 });
    }

    const template = await prisma.taskTemplate.create({
      data: orgData(orgId, {
        name: body.name,
        description: body.description || "",
        tasks: body.tasks,
      }),
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
