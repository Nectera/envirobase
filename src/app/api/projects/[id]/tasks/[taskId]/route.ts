import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
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

    const task = await prisma.projectTask.update({
      where: orgWhere(orgId, { id: params.taskId }),
      data: {
        status: body.status,
        date: body.status === "completed" ? new Date() : body.date ? new Date(body.date) : undefined,
      },
    });

    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
