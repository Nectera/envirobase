import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — list all Xact line items, optional filters
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const projectType = url.searchParams.get("projectType");
    const search = url.searchParams.get("search");
    const favoritesOnly = url.searchParams.get("favorites") === "true";

    const where: any = orgWhere(orgId, {});
    if (category) where.category = category;
    if (projectType) where.projectTypes = { has: projectType };
    if (favoritesOnly) where.favorite = true;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.xactLineItem.findMany({
      where,
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });

    const categories = await prisma.xactLineItem.findMany({
      where: orgWhere(orgId, {}),
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });

    return NextResponse.json({ items, categories: categories.map((c: any) => c.category) });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create new Xact line item
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = (session.user as any)?.role;
    if (!["ADMIN", "PROJECT_MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { code, category, description, unit, defaultRate, projectTypes, notes } = body;

    if (!code || !category || !description || !unit) {
      return NextResponse.json({ error: "code, category, description, and unit are required" }, { status: 400 });
    }

    const item = await prisma.xactLineItem.create({
      data: orgData(orgId, {
        code: code.trim(),
        category: category.trim().toUpperCase(),
        description: description.trim(),
        unit: unit.trim().toUpperCase(),
        defaultRate: defaultRate ? parseFloat(defaultRate) : null,
        projectTypes: projectTypes || [],
        notes: notes || null,
      }),
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
