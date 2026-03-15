import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const record = await prisma.companyInfo.findFirst({ where: orgWhere(orgId) });
    if (!record) {
      return NextResponse.json(null);
    }
    // Return the JSON data field merged with the record id
    const info = { id: record.id, ...(record.data as Record<string, any> || {}) };
    return NextResponse.json(info);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
    // Strip id from the body so we only store actual company fields in the data JSON
    const { id, ...companyData } = body;

    // Find existing record to upsert against
    const existing = await prisma.companyInfo.findFirst({ where: orgWhere(orgId) });

    let record;
    if (existing) {
      record = await prisma.companyInfo.update({
        where: { id: existing.id },
        data: { data: companyData },
      });
    } else {
      record = await prisma.companyInfo.create({
        data: orgData(orgId, { data: companyData }),
      });
    }

    const info = { id: record.id, ...(record.data as Record<string, any> || {}) };
    return NextResponse.json(info);
  } catch (error: any) {
    console.error("Error saving company info:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
