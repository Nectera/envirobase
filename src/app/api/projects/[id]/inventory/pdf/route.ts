import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import fs from "fs";
import path from "path";

export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  // Fetch project + inventory items with photos
  const [project, items, review] = await Promise.all([
    prisma.project.findFirst({
      where: { id: params.id, ...(orgId ? { organizationId: orgId } : {}) },
      select: { id: true, name: true, address: true, city: true, state: true, zip: true, customerName: true },
    }),
    prisma.contentInventoryItem.findMany({
      where: { projectId: params.id },
      include: { photos: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.contentInventoryReview.findFirst({ where: { projectId: params.id } }).catch(() => null),
  ]);

  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Logo
  let logoImg: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
    logoImg = await pdfDoc.embedPng(logoBytes);
  } catch { /* ok */ }

  // ── Brand palette ──
  const BRAND = rgb(0.484, 0.757, 0.263);
  const CHARCOAL = rgb(0.06, 0.09, 0.16);
  const DARK = rgb(0.12, 0.12, 0.12);
  const MID = rgb(0.30, 0.30, 0.30);
  const GRAY = rgb(0.50, 0.50, 0.50);
  const RULE = rgb(0.88, 0.88, 0.88);
  const WHITE = rgb(1, 1, 1);
  const LIGHT_BG = rgb(0.97, 0.98, 0.96);
  const GREEN_BG = rgb(0.94, 0.98, 0.94);
  const RED_BG = rgb(0.99, 0.94, 0.94);

  const PW = 612, PH = 792;
  const ML = 48, MR = 48;
  const CW = PW - ML - MR;
  const RE = PW - MR;

  let page: PDFPage = pdfDoc.addPage([PW, PH]);
  let y = PH;
  let pageNum = 0;

  // ── Drawing helpers ──
  function txt(t: string, x: number, yp: number, o: { f?: PDFFont; s?: number; c?: ReturnType<typeof rgb> } = {}) {
    page.drawText(String(t ?? ""), { x, y: yp, size: o.s || 10, font: o.f || font, color: o.c || DARK });
  }
  function ln(x1: number, yp: number, x2: number, c = RULE, th = 0.5) {
    page.drawLine({ start: { x: x1, y: yp }, end: { x: x2, y: yp }, thickness: th, color: c });
  }
  function box(x: number, yp: number, w: number, h: number, c: ReturnType<typeof rgb>) {
    page.drawRectangle({ x, y: yp, width: w, height: h, color: c });
  }
  function tw(t: string, f: PDFFont, s: number) { return f.widthOfTextAtSize(String(t ?? ""), s); }
  function ra(t: string, f: PDFFont, s: number, rx: number) { return rx - tw(t, f, s); }

  function drawDiamondStrip(yTop: number, height: number) {
    const size = 24;
    const cols = Math.ceil(PW / size) + 1;
    const rows = Math.ceil(height / size) + 1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * size + (row % 2 === 0 ? 0 : size / 2);
        const cy = yTop - row * size;
        if (cy < yTop - height || cy > yTop) continue;
        const r = size * 0.42;
        const pts = [
          { x: cx, y: cy + r },
          { x: cx + r, y: cy },
          { x: cx, y: cy - r },
          { x: cx - r, y: cy },
        ];
        for (let i = 0; i < 4; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % 4];
          page.drawLine({
            start: { x: a.x, y: a.y },
            end: { x: b.x, y: b.y },
            thickness: 0.3,
            color: rgb(0.75, 0.85, 0.70),
            opacity: 0.15,
          });
        }
      }
    }
  }

  function footer() {
    pageNum++;
    box(0, 0, PW, 20, CHARCOAL);
    txt("Xtract Environmental Services", ML, 6, { s: 7, c: WHITE, f: fontBold });
    const pg = `Page ${pageNum}`;
    txt(pg, ra(pg, font, 7, RE), 6, { s: 7, c: rgb(0.6, 0.6, 0.6) });
  }

  function pageBreak(needed: number) {
    if (y - needed < 42) {
      footer();
      page = pdfDoc.addPage([PW, PH]);
      y = PH - 44;
      return true;
    }
    return false;
  }

  function wrap(t: string, f: PDFFont, s: number, mw: number): string[] {
    const out: string[] = [];
    for (const para of String(t ?? "").split("\n")) {
      if (!para.trim()) { out.push(""); continue; }
      let cur = "";
      for (const w of para.split(" ")) {
        const test = cur ? `${cur} ${w}` : w;
        if (f.widthOfTextAtSize(test, s) > mw) { if (cur) out.push(cur); cur = w; }
        else cur = test;
      }
      if (cur) out.push(cur);
    }
    return out;
  }

  function drawWrap(t: string, x: number, f: PDFFont, s: number, c: ReturnType<typeof rgb>, mw: number, lh = 13) {
    for (const l of wrap(t, f, s, mw)) {
      pageBreak(lh + 2);
      if (l === "") { y -= lh * 0.4; continue; }
      txt(l, x, y, { f, s, c });
      y -= lh;
    }
  }

  // ── Header ──
  function drawHeader(rightLabel: string) {
    const HDR_H = 72;
    box(0, PH - HDR_H, PW, HDR_H, CHARCOAL);
    drawDiamondStrip(PH, HDR_H);
    box(0, PH - HDR_H, PW, 3, BRAND);

    const logoY = PH - HDR_H + 14;
    if (logoImg) {
      const logoSize = 44;
      const logoCx = ML + logoSize / 2;
      const logoCy = logoY + logoSize / 2;
      page.drawEllipse({
        x: logoCx, y: logoCy,
        xScale: logoSize / 2 + 4, yScale: logoSize / 2 + 4,
        color: WHITE,
      });
      page.drawImage(logoImg, { x: ML + 2, y: logoY + 2, width: logoSize - 4, height: logoSize - 4 });
      txt("XTRACT", ML + logoSize + 14, PH - 30, { f: fontBold, s: 20, c: WHITE });
      txt("Environmental Services", ML + logoSize + 14, PH - 45, { s: 9, c: rgb(0.7, 0.7, 0.7) });
    } else {
      txt("XTRACT", ML, PH - 30, { f: fontBold, s: 20, c: WHITE });
      txt("Environmental Services", ML, PH - 45, { s: 9, c: rgb(0.7, 0.7, 0.7) });
    }

    txt(rightLabel, ra(rightLabel, fontBold, 22, RE), PH - 35, { f: fontBold, s: 22, c: BRAND });
    return PH - HDR_H - 22;
  }

  // ══════════════════════════════════════════════════════
  // PAGE 1: HEADER + PROJECT INFO + SUMMARY
  // ══════════════════════════════════════════════════════

  y = drawHeader("INVENTORY");

  // Project info
  const cL = ML;
  const cR = PW / 2 + 20;
  const valOffset = 60;
  const valOffsetR = 70;

  function infoL(label: string, val: string) {
    txt(label, cL, y, { f: fontBold, s: 8, c: GRAY });
    txt(val, cL + valOffset, y, { s: 9.5, c: DARK });
  }
  function infoR(label: string, val: string) {
    txt(label, cR, y, { f: fontBold, s: 8, c: GRAY });
    txt(val, cR + valOffsetR, y, { s: 9.5, c: DARK });
  }

  const dateDisplay = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  infoL("Project:", (project as any).name || "—");
  infoR("Date:", dateDisplay);
  y -= 16;

  infoL("Client:", (project as any).customerName || "—");
  y -= 16;

  const addrParts = [(project as any).address, (project as any).city, (project as any).state || "CO"].filter(Boolean);
  const addrLine = addrParts.join(", ") + " " + ((project as any).zip || "");
  infoL("Address:", addrLine.trim() || "—");
  y -= 22;

  ln(ML, y, RE, BRAND, 1);
  y -= 22;

  // Summary stats
  const keepCount = items.filter((i: any) => i.status === "keep").length;
  const disposeCount = items.filter((i: any) => i.status === "dispose").length;
  const pendingCount = items.filter((i: any) => i.status === "pending").length;

  box(ML, y - 1, 3, 14, BRAND);
  txt("Inventory Summary", ML + 10, y, { f: fontBold, s: 11, c: CHARCOAL });
  y -= 20;

  // Stats row
  const statBoxW = (CW - 20) / 3;

  // Total items
  box(ML, y - 28, statBoxW, 36, LIGHT_BG);
  txt("Total Items", ML + 10, y, { f: fontBold, s: 8, c: GRAY });
  txt(String(items.length), ML + 10, y - 18, { f: fontBold, s: 16, c: CHARCOAL });

  // Keep
  box(ML + statBoxW + 10, y - 28, statBoxW, 36, GREEN_BG);
  txt("Keep", ML + statBoxW + 20, y, { f: fontBold, s: 8, c: rgb(0.13, 0.55, 0.13) });
  txt(String(keepCount), ML + statBoxW + 20, y - 18, { f: fontBold, s: 16, c: rgb(0.13, 0.55, 0.13) });

  // Dispose
  box(ML + statBoxW * 2 + 20, y - 28, statBoxW, 36, RED_BG);
  txt("Dispose", ML + statBoxW * 2 + 30, y, { f: fontBold, s: 8, c: rgb(0.7, 0.15, 0.15) });
  txt(String(disposeCount), ML + statBoxW * 2 + 30, y - 18, { f: fontBold, s: 16, c: rgb(0.7, 0.15, 0.15) });

  y -= 50;

  if (pendingCount > 0) {
    txt(`${pendingCount} item${pendingCount !== 1 ? "s" : ""} pending customer decision`, ML, y, { f: fontItalic, s: 8.5, c: GRAY });
    y -= 16;
  }

  if (review) {
    const statusLabel = (review as any).status === "completed" ? "Completed" : (review as any).status === "in_progress" ? "In Progress" : "Sent";
    txt(`Customer Review: ${statusLabel}`, ML, y, { f: fontItalic, s: 8.5, c: GRAY });
    if ((review as any).customerName) {
      txt(`Customer: ${(review as any).customerName}`, ML + 200, y, { f: fontItalic, s: 8.5, c: GRAY });
    }
    y -= 16;
  }

  y -= 10;
  ln(ML, y, RE, RULE, 0.5);
  y -= 22;

  // ══════════════════════════════════════════════════════
  // ITEM LIST
  // ══════════════════════════════════════════════════════

  box(ML, y - 1, 3, 14, BRAND);
  txt("Item Details", ML + 10, y, { f: fontBold, s: 11, c: CHARCOAL });
  y -= 22;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx] as any;

    // Each item needs at least ~70px
    pageBreak(80);

    // Item number + name
    const itemLabel = item.brand && item.model
      ? `${item.brand} ${item.model}`
      : item.brand || item.description.slice(0, 60);
    txt(`${idx + 1}.`, ML, y, { f: fontBold, s: 9, c: GRAY });
    txt(itemLabel, ML + 18, y, { f: fontBold, s: 10, c: CHARCOAL });

    // Status badge text
    const statusText = item.status === "keep" ? "KEEP" : item.status === "dispose" ? "DISPOSE" : "PENDING";
    const statusColor = item.status === "keep" ? rgb(0.13, 0.55, 0.13) : item.status === "dispose" ? rgb(0.7, 0.15, 0.15) : GRAY;
    txt(statusText, ra(statusText, fontBold, 8, RE), y + 1, { f: fontBold, s: 8, c: statusColor });
    y -= 14;

    // Details row
    const details: string[] = [];
    if (item.brand) details.push(`Brand: ${item.brand}`);
    if (item.model) details.push(`Model: ${item.model}`);
    if (item.location) details.push(`Location: ${item.location}`);
    if (details.length > 0) {
      txt(details.join("  |  "), ML + 18, y, { s: 8, c: GRAY });
      y -= 13;
    }

    // Description
    const descLines = wrap(item.description, font, 8.5, CW - 22);
    const maxDescLines = 4;
    for (let li = 0; li < Math.min(descLines.length, maxDescLines); li++) {
      pageBreak(12);
      txt(descLines[li], ML + 18, y, { s: 8.5, c: MID });
      y -= 12;
    }
    if (descLines.length > maxDescLines) {
      txt("...", ML + 18, y, { s: 8.5, c: GRAY });
      y -= 12;
    }

    // Customer note
    if (item.customerNote) {
      pageBreak(14);
      txt(`Customer note: ${item.customerNote}`, ML + 18, y, { f: fontItalic, s: 8, c: rgb(0.6, 0.45, 0.0) });
      y -= 13;
    }

    // Photo count
    if (item.photos && item.photos.length > 0) {
      txt(`${item.photos.length} photo${item.photos.length !== 1 ? "s" : ""} attached`, ML + 18, y, { s: 7.5, c: GRAY });
      y -= 12;
    }

    y -= 6;

    // Divider between items
    if (idx < items.length - 1) {
      ln(ML + 18, y, RE, RULE, 0.3);
      y -= 12;
    }
  }

  if (items.length === 0) {
    txt("No inventory items have been added to this project.", ML, y, { f: fontItalic, s: 10, c: GRAY });
    y -= 20;
  }

  footer();

  // ── Serialize ──
  const pdfBytes = await pdfDoc.save();
  const safeName = ((project as any).name || "Inventory").replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "_");
  const filename = `Xtract_Inventory_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(Buffer.from(pdfBytes)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
