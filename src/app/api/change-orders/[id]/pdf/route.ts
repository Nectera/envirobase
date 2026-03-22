import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";

const sanitize = (val: any): string => {
  if (val == null) return "";
  const str = typeof val === "string" ? val : String(val);
  return str.replace(/[\n\r\t]/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
};

/**
 * GET /api/change-orders/[id]/pdf
 * Generate a branded PDF for a change order.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const order = await prisma.changeOrder.findUnique({
      where: { id: params.id },
      include: { project: true },
    });

    if (!order) return NextResponse.json({ error: "Change order not found" }, { status: 404 });

    // Get org branding
    let companyName = "Environmental Services";
    let companyAddr = "";
    if (orgId) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { companyName: true, companyShort: true, companyLocation: true },
      });
      if (org) {
        companyName = org.companyName || org.companyShort || "Environmental Services";
        companyAddr = org.companyLocation || "";
      }
    }

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([612, 792]);
    const { width } = page.getSize();
    const MARGIN = 50;
    const MAX_W = width - MARGIN * 2;
    let y = 750;

    // ── Company header (centered) ──
    let tw = bold.widthOfTextAtSize(companyName, 16);
    page.drawText(companyName, { x: (width - tw) / 2, y, font: bold, size: 16, color: rgb(0, 0, 0) });
    y -= 18;
    if (companyAddr) {
      tw = font.widthOfTextAtSize(companyAddr, 10);
      page.drawText(companyAddr, { x: (width - tw) / 2, y, font, size: 10, color: rgb(0.4, 0.4, 0.4) });
      y -= 30;
    } else {
      y -= 12;
    }

    // ── Title ──
    const title = `Change Order #${order.number}`;
    tw = bold.widthOfTextAtSize(title, 18);
    page.drawText(title, { x: (width - tw) / 2, y, font: bold, size: 18, color: rgb(0.2, 0.2, 0.2) });
    y -= 14;

    // Status badge
    const statusLabels: Record<string, string> = {
      draft: "DRAFT",
      pending_approval: "PENDING APPROVAL",
      approved: "APPROVED",
      rejected: "REJECTED",
    };
    const statusText = statusLabels[order.status] || order.status.toUpperCase();
    tw = bold.widthOfTextAtSize(statusText, 10);
    const statusColor = order.status === "approved"
      ? rgb(0.1, 0.6, 0.2)
      : order.status === "rejected"
      ? rgb(0.8, 0.2, 0.1)
      : rgb(0.6, 0.5, 0.0);
    page.drawText(statusText, { x: (width - tw) / 2, y, font: bold, size: 10, color: statusColor });
    y -= 35;

    // ── Horizontal divider ──
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: width - MARGIN, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 25;

    // ── Project info fields ──
    const drawField = (label: string, value: string) => {
      page.drawText(sanitize(label), { x: MARGIN, y, font: bold, size: 10, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(sanitize(value), { x: MARGIN + 140, y, font, size: 11, color: rgb(0.15, 0.15, 0.15) });
      y -= 18;
    };

    drawField("Project:", order.project?.name || "—");
    if (order.project?.projectNumber) drawField("Project #:", order.project.projectNumber);
    drawField("Client:", order.project?.client || "—");
    drawField("Address:", order.project?.address || "—");
    y -= 8;

    drawField("CO Number:", `#${order.number}`);
    drawField("Date Created:", new Date(order.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
    drawField("Created By:", order.createdBy);
    if (order.approvedBy) {
      drawField(order.status === "approved" ? "Approved By:" : "Reviewed By:", order.approvedBy);
      if (order.approvedAt) {
        drawField("Date:", new Date(order.approvedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
      }
    }
    y -= 10;

    // ── Divider ──
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: width - MARGIN, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 25;

    // ── Change Order Title ──
    page.drawText("Title", { x: MARGIN, y, font: bold, size: 10, color: rgb(0.4, 0.4, 0.4) });
    y -= 16;
    const titleLines = wrapText(sanitize(order.title), MAX_W, font, 11);
    for (const line of titleLines) {
      page.drawText(line, { x: MARGIN, y, font: bold, size: 11, color: rgb(0.15, 0.15, 0.15) });
      y -= 14;
    }
    y -= 10;

    // ── Description ──
    page.drawText("Description of Change", { x: MARGIN, y, font: bold, size: 10, color: rgb(0.4, 0.4, 0.4) });
    y -= 16;
    const descLines = wrapText(sanitize(order.description), MAX_W, font, 10);
    for (const line of descLines) {
      if (y < 60) {
        page = pdf.addPage([612, 792]);
        y = 750;
      }
      page.drawText(line, { x: MARGIN, y, font, size: 10, color: rgb(0.2, 0.2, 0.2) });
      y -= 14;
    }
    y -= 10;

    // ── Reason ──
    if (order.reason) {
      const reasonLabels: Record<string, string> = {
        scope_change: "Scope Change",
        unforeseen_conditions: "Unforeseen Conditions",
        client_request: "Client Request",
        regulatory: "Regulatory Requirement",
        other: "Other",
      };
      page.drawText("Reason:", { x: MARGIN, y, font: bold, size: 10, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(reasonLabels[order.reason] || order.reason, { x: MARGIN + 140, y, font, size: 10, color: rgb(0.2, 0.2, 0.2) });
      y -= 20;
    }

    // ── Cost & Timeline Impact ──
    if (y < 120) {
      page = pdf.addPage([612, 792]);
      y = 750;
    }

    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: width - MARGIN, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 25;

    page.drawText("Impact Summary", { x: MARGIN, y, font: bold, size: 12, color: rgb(0.2, 0.2, 0.2) });
    y -= 22;

    // Cost impact
    const costStr = order.costImpact >= 0
      ? `+$${order.costImpact.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : `-$${Math.abs(order.costImpact).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    const costColor = order.costImpact > 0 ? rgb(0.8, 0.2, 0.1) : order.costImpact < 0 ? rgb(0.1, 0.6, 0.2) : rgb(0.4, 0.4, 0.4);
    page.drawText("Cost Impact:", { x: MARGIN, y, font: bold, size: 10, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(costStr, { x: MARGIN + 140, y, font: bold, size: 12, color: costColor });
    y -= 20;

    // Timeline impact
    const daysStr = order.daysImpact > 0
      ? `+${order.daysImpact} day${order.daysImpact !== 1 ? "s" : ""}`
      : order.daysImpact < 0
      ? `${order.daysImpact} day${Math.abs(order.daysImpact) !== 1 ? "s" : ""}`
      : "No change";
    const daysColor = order.daysImpact > 0 ? rgb(0.8, 0.2, 0.1) : order.daysImpact < 0 ? rgb(0.1, 0.6, 0.2) : rgb(0.4, 0.4, 0.4);
    page.drawText("Timeline Impact:", { x: MARGIN, y, font: bold, size: 10, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(daysStr, { x: MARGIN + 140, y, font: bold, size: 12, color: daysColor });
    y -= 30;

    // ── Rejection note ──
    if (order.status === "rejected" && order.rejectionNote) {
      page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
      y -= 20;
      page.drawText("Rejection Reason:", { x: MARGIN, y, font: bold, size: 10, color: rgb(0.8, 0.2, 0.1) });
      y -= 16;
      const rejectLines = wrapText(sanitize(order.rejectionNote), MAX_W, font, 10);
      for (const line of rejectLines) {
        page.drawText(line, { x: MARGIN, y, font, size: 10, color: rgb(0.4, 0.2, 0.2) });
        y -= 14;
      }
    }

    // ── Signature lines (for approved orders) ──
    if (order.status === "approved") {
      y -= 30;
      if (y < 120) { page = pdf.addPage([612, 792]); y = 750; }

      page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
      y -= 30;

      // Authorized signature line
      page.drawLine({ start: { x: MARGIN, y }, end: { x: 280, y }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) });
      page.drawText("Authorized Signature", { x: MARGIN, y: y - 14, font, size: 9, color: rgb(0.5, 0.5, 0.5) });

      page.drawLine({ start: { x: 330, y }, end: { x: width - MARGIN, y }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) });
      page.drawText("Date", { x: 330, y: y - 14, font, size: 9, color: rgb(0.5, 0.5, 0.5) });
      y -= 40;

      // Client signature line
      page.drawLine({ start: { x: MARGIN, y }, end: { x: 280, y }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) });
      page.drawText("Client Signature", { x: MARGIN, y: y - 14, font, size: 9, color: rgb(0.5, 0.5, 0.5) });

      page.drawLine({ start: { x: 330, y }, end: { x: width - MARGIN, y }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) });
      page.drawText("Date", { x: 330, y: y - 14, font, size: 9, color: rgb(0.5, 0.5, 0.5) });
    }

    // Generate PDF bytes
    const pdfBytes = await pdf.save();
    const projectName = sanitize(order.project?.name || "Project").replace(/\s+/g, "-");

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Change-Order-${order.number}-${projectName}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Change order PDF error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Wrap text to fit within maxWidth */
function wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ["N/A"];
}
