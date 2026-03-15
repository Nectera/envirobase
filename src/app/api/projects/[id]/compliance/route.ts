import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireOrg();
    if (authResult instanceof NextResponse) return authResult;
    const { session, orgId } = authResult;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    const result = await prisma.complianceCheck.upsert({
      where: orgWhere(orgId, {
        projectId_itemKey: {
          projectId: params.id,
          itemKey: body.itemKey,
        },
      }),
      update: {
        checked: body.checked,
        checkedAt: body.checked ? new Date() : null,
      },
      create: orgData(orgId, {
        projectId: params.id,
        itemKey: body.itemKey,
        checked: body.checked,
        checkedAt: body.checked ? new Date() : null,
      }),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
