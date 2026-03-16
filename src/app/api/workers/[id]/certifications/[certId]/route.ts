import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/workers/[id]/certifications/[certId]
 * Remove a certification record.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; certId: string } },
) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    // Verify cert belongs to worker
    const cert = await prisma.certification.findUnique({ where: orgWhere(orgId, { id: params.certId }) });
    if (!cert || cert.workerId !== params.id) {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }

    await prisma.certification.delete({ where: orgWhere(orgId, { id: params.certId }) });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Certification delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
