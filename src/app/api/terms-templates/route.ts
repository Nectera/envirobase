import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** GET /api/terms-templates — list all templates */
export async function GET() {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const templates = await prisma.termsTemplate.findMany({
      where: orgWhere(orgId),
      orderBy: { name: "asc" },
    });
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error("Terms templates GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/terms-templates — create a template */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { name, terms } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }
    if (!Array.isArray(terms) || terms.length === 0) {
      return NextResponse.json({ error: "At least one term is required" }, { status: 400 });
    }

    const template = await prisma.termsTemplate.create({
      data: orgData(orgId, { name: name.trim(), terms }),
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error("Terms templates POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
