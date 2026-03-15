import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { batchLeadActionSchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/leads/batch — bulk update or delete leads
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const v = validateBody(batchLeadActionSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });
    const { action, ids, status, fields } = v.data;

    const userRole = (session.user as any)?.role || "TECHNICIAN";

    if (action === "updateStatus") {
      if (!status) {
        return NextResponse.json({ error: "Status is required" }, { status: 400 });
      }
      let totalUpdated = 0;
      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);
        const updateResult = await prisma.lead.updateMany({
          where: orgWhere(orgId, { id: { in: batch } }),
          data: { status },
        });
        totalUpdated += updateResult.count;
      }
      return NextResponse.json({ success: true, updated: totalUpdated });
    }

    if (action === "bulkUpdate") {
      if (!fields || Object.keys(fields).length === 0) {
        return NextResponse.json({ error: "No fields provided to update" }, { status: 400 });
      }

      // Whitelist allowed bulk-editable fields
      const ALLOWED_FIELDS = new Set([
        "status", "projectType", "office", "source", "assignedTo",
        "lostReason", "lostDate", "isInsuranceJob",
      ]);
      const data: Record<string, any> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (ALLOWED_FIELDS.has(key)) {
          data[key] = value;
        }
      }

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
      }

      // Block bulk "won" — won has complex side effects (creates projects, contacts, etc.)
      if (data.status === "won") {
        return NextResponse.json({ error: "Cannot bulk-set status to 'won'. Each lead must be marked won individually." }, { status: 400 });
      }

      // Auto-set lostDate when marking as lost
      if (data.status === "lost" && !data.lostDate) {
        data.lostDate = new Date().toISOString().split("T")[0];
      }

      let totalUpdated = 0;
      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);
        const updateResult = await prisma.lead.updateMany({
          where: orgWhere(orgId, { id: { in: batch } }),
          data,
        });
        totalUpdated += updateResult.count;
      }
      return NextResponse.json({ success: true, updated: totalUpdated });
    }

    if (action === "delete") {
      // Only admins can delete
      if (userRole !== "ADMIN") {
        return NextResponse.json({ error: "Only admins can delete leads" }, { status: 403 });
      }
      let deleted = 0;
      for (const id of ids) {
        await prisma.lead.delete({ where: orgWhere(orgId, { id }) });
        deleted++;
      }
      return NextResponse.json({ success: true, deleted });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Batch leads error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
