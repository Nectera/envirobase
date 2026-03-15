import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { createKnowledgeBaseSchema, validateBody } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const where = category ? { ...orgWhere(orgId), category } : orgWhere(orgId);
    const articles = await prisma.knowledgeBase.findMany({ where });
    return NextResponse.json(articles);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const role = session.user.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = await req.json();
    const v = validateBody(createKnowledgeBaseSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });
    const { title, category, content } = v.data;
    const tags = body.tags;
    const article = await prisma.knowledgeBase.create({
      data: orgData(orgId, {
        title,
        category,
        tags: tags || [],
        content,
        createdBy: session.user.name || "Unknown",
      }),
    });
    return NextResponse.json(article, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
