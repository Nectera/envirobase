import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";

/**
 * POST /api/projects/[id]/clearance
 * Upload clearance report and/or invoice, save results, and update post-cost COGS.
 *
 * Accepts FormData with:
 * - report (File, optional) — clearance report PDF/image
 * - invoice (File, optional) — clearance invoice PDF/image
 * - result (string) — pass | fail | pending
 * - date (string) — YYYY-MM-DD
 * - cost (number) — actual clearance cost from invoice
 * - vendor (string) — lab/vendor name
 * - notes (string, optional)
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const userId = (session.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const formData = await req.formData();
    const report = formData.get("report") as File | null;
    const invoice = formData.get("invoice") as File | null;
    const clearanceResult = formData.get("result") as string || null;
    const date = formData.get("date") as string || null;
    const cost = formData.get("cost") ? Number(formData.get("cost")) : null;
    const vendor = formData.get("vendor") as string || null;
    const notes = formData.get("notes") as string || null;

    const MAX_SIZE = 25 * 1024 * 1024;

    const updateData: any = {};
    if (clearanceResult) updateData.clearanceResult = clearanceResult;
    if (date) updateData.clearanceDate = date;
    if (cost !== null && !isNaN(cost)) updateData.clearanceCost = cost;
    if (vendor) updateData.clearanceVendor = vendor;
    if (notes !== undefined) updateData.clearanceNotes = notes;

    // Upload report file
    if (report && report.size > 0) {
      if (report.size > MAX_SIZE) {
        return NextResponse.json({ error: "Report file too large (max 25MB)" }, { status: 400 });
      }
      const ext = report.name.split(".").pop() || "pdf";
      const path = `${params.id}/clearance/report-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const buf = Buffer.from(await report.arrayBuffer());
      const { data: up, error: upErr } = await supabase.storage
        .from(DOCUMENTS_BUCKET).upload(path, buf, { contentType: report.type, upsert: false });
      if (upErr) {
        console.error("Report upload error:", upErr);
        return NextResponse.json({ error: "Report upload failed" }, { status: 500 });
      }
      const { data: urlData } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(up.path);
      updateData.clearanceReportUrl = urlData.publicUrl;
      updateData.clearanceReportName = report.name;
    }

    // Upload invoice file
    if (invoice && invoice.size > 0) {
      if (invoice.size > MAX_SIZE) {
        return NextResponse.json({ error: "Invoice file too large (max 25MB)" }, { status: 400 });
      }
      const ext = invoice.name.split(".").pop() || "pdf";
      const path = `${params.id}/clearance/invoice-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const buf = Buffer.from(await invoice.arrayBuffer());
      const { data: up, error: upErr } = await supabase.storage
        .from(DOCUMENTS_BUCKET).upload(path, buf, { contentType: invoice.type, upsert: false });
      if (upErr) {
        console.error("Invoice upload error:", upErr);
        return NextResponse.json({ error: "Invoice upload failed" }, { status: 500 });
      }
      const { data: urlData } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(up.path);
      updateData.clearanceInvoiceUrl = urlData.publicUrl;
      updateData.clearanceInvoiceName = invoice.name;
    }

    // Update project
    const project = await prisma.project.update({
      where: orgWhere(orgId, { id: params.id }),
      data: updateData,
    });

    // Auto-update post-cost estimate COGS clearance line if cost is provided
    let postCostUpdated = false;
    if (cost !== null && !isNaN(cost)) {
      // Find post-cost estimate linked to this project
      const postCostEstimates = await prisma.consultationEstimate.findMany({
        where: orgWhere(orgId, { projectId: params.id, isPostCost: true }),
      });

      for (const est of postCostEstimates) {
        const cogs: any[] = Array.isArray(est.cogs) ? [...(est.cogs as any[])] : [];
        const clearanceIdx = cogs.findIndex((c: any) => c.item === "Clearance");
        if (clearanceIdx >= 0) {
          cogs[clearanceIdx] = { ...cogs[clearanceIdx], qty: 1, cost };
        } else {
          cogs.push({ item: "Clearance", qty: 1, cost });
        }
        const cogsCost = cogs.reduce((sum: number, c: any) => sum + (c.cost || 0), 0);

        await prisma.consultationEstimate.update({
          where: orgWhere(orgId, { id: est.id }),
          data: { cogs, cogsCost },
        });
        postCostUpdated = true;
      }
    }

    return NextResponse.json({
      ...project,
      postCostUpdated,
    });
  } catch (error: any) {
    console.error("Clearance save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
