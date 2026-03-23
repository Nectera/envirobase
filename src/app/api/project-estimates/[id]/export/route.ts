import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/project-estimates/[id]/export?format=csv|xact
 *
 * Exports an estimate in a format compatible with Xactimate.
 * - csv: Standard CSV with all line item fields
 * - xact: Xactimate-structured CSV formatted for Xactimate entry/import
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const format = req.nextUrl.searchParams.get("format") || "csv";

  const estimate = await prisma.projectEstimate.findFirst({
    where: { id: params.id, organizationId: orgId },
    include: {
      lineItems: {
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      },
      project: {
        select: {
          name: true,
          projectNumber: true,
          address: true,
          client: true,
          type: true,
        },
      },
    },
  });

  if (!estimate)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get org name for branding
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });
  const orgName = org?.name || "Estimate Export";

  const project = estimate.project;
  const projectName = project?.name || "Project";
  const projectNum = (project as any)?.projectNumber || "";
  const safeFilename = `${projectName.replace(/[^a-zA-Z0-9-_ ]/g, "")}_Estimate_${estimate.number}`.replace(/\s+/g, "_");

  if (format === "xact") {
    // Xactimate-compatible CSV format
    const rows: string[][] = [];

    // Header row matching Xactimate field names
    rows.push([
      "Activity",       // Category code (ACM, DEM, CLN, etc.)
      "Selector",       // Xactimate selector code
      "Description",    // Line item description
      "Room/Area",      // Room assignment
      "Quantity",       // Amount
      "Unit",           // SF, LF, EA, HR, etc.
      "Unit Price",     // Price per unit
      "Line Total",     // Quantity × Unit Price
      "Notes",          // Additional notes
    ]);

    // Group by category for Xactimate-style output
    const catMap: Record<string, typeof estimate.lineItems> = {};
    for (const li of estimate.lineItems) {
      const cat = li.category || "GEN";
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(li);
    }

    for (const [category, items] of Object.entries(catMap)) {
      // Category separator row
      rows.push([`--- ${category} ---`, "", "", "", "", "", "", "", ""]);

      for (const li of items) {
        rows.push([
          category,
          li.xactCode || "",
          li.description,
          li.room || "",
          li.quantity.toString(),
          li.unit,
          li.unitPrice.toFixed(2),
          li.total.toFixed(2),
          li.notes || "",
        ]);
      }

      // Category subtotal
      const catTotal = items.reduce((s: number, li: any) => s + li.total, 0);
      rows.push(["", "", `${category} Subtotal`, "", "", "", "", catTotal.toFixed(2), ""]);
    }

    // Grand total
    rows.push([]);
    rows.push(["", "", "GRAND TOTAL", "", "", "", "", estimate.totalAmount.toFixed(2), ""]);

    const csv = buildCsv(rows);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFilename}_Xact.csv"`,
      },
    });
  }

  // Standard CSV format — all fields, clean for spreadsheet use
  const rows: string[][] = [];

  // Project info header
  rows.push([`${orgName} — Estimate Export`]);
  rows.push([`Project: ${projectName}${projectNum ? ` (#${projectNum})` : ""}`]);
  rows.push([`Address: ${project?.address || "N/A"}`]);
  rows.push([`Client: ${project?.client || "N/A"}`]);
  rows.push([`Estimate #${estimate.number} — ${estimate.type === "supplement" ? "Supplement" : "Original"}`]);
  rows.push([`Status: ${estimate.status.toUpperCase()}`]);
  rows.push([`Total: $${estimate.totalAmount.toFixed(2)}`]);
  if (estimate.approvedAmount != null) {
    rows.push([`Approved Amount: $${estimate.approvedAmount.toFixed(2)}`]);
  }
  rows.push([`Exported: ${new Date().toLocaleDateString("en-US")}`]);
  rows.push([]);

  // Column headers
  rows.push([
    "Category",
    "Xact Code",
    "Description",
    "Room",
    "Qty",
    "Unit",
    "Unit Price",
    "Total",
    "Notes",
  ]);

  // Line items grouped by category
  const catGroups: Record<string, typeof estimate.lineItems> = {};
  for (const li of estimate.lineItems) {
    const cat = li.category || "Other";
    if (!catGroups[cat]) catGroups[cat] = [];
    catGroups[cat].push(li);
  }

  for (const [category, items] of Object.entries(catGroups)) {
    for (const li of items) {
      rows.push([
        category,
        li.xactCode || "",
        li.description,
        li.room || "",
        li.quantity.toString(),
        li.unit,
        li.unitPrice.toFixed(2),
        li.total.toFixed(2),
        li.notes || "",
      ]);
    }
    // Category subtotal
    const catTotal = items.reduce((s: number, li: any) => s + li.total, 0);
    rows.push(["", "", `${category} Subtotal`, "", "", "", "", catTotal.toFixed(2), ""]);
  }

  // Grand total
  rows.push([]);
  rows.push(["", "", "GRAND TOTAL", "", "", "", "", estimate.totalAmount.toFixed(2), ""]);

  const csv = buildCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename}.csv"`,
    },
  });
}

/** Properly escape CSV fields (handles commas, quotes, newlines) */
function buildCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const str = cell?.toString() || "";
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\n");
}
