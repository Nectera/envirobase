import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    const record = await prisma.medicalRecord.create({
      data: orgData(orgId, {
        workerId: params.id,
        examDate: new Date(body.examDate),
        nextExamDate: new Date(body.nextExamDate),
        respiratorFitDate: body.respiratorFitDate ? new Date(body.respiratorFitDate) : null,
        bll: body.bll || null,
        physician: body.physician || null,
        findings: body.findings || null,
        restrictions: body.restrictions || null,
      }),
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
