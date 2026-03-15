import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { COMPANY_NAME } from "@/lib/branding";

export const dynamic = "force-dynamic";

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return "";
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCsv(data: any[]): string {
  if (data.length === 0) return "";
  const allKeys = new Set<string>();
  data.forEach((item) => Object.keys(item).forEach((k) => allKeys.add(k)));
  const headers = Array.from(allKeys);
  const lines = [headers.map(escapeCsv).join(",")];
  data.forEach((item) => {
    lines.push(headers.map((h) => escapeCsv(item[h])).join(","));
  });
  return lines.join("\n");
}

async function getCrmTables(orgId: string | null): Promise<Record<string, any[]>> {
  const [companies, contacts, leads, estimates, invoices, activities] = await Promise.all([
    prisma.company.findMany({ where: orgWhere(orgId, {}) }),
    prisma.contact.findMany({ where: orgWhere(orgId, {}) }),
    prisma.lead.findMany({ where: orgWhere(orgId, {}) }),
    prisma.estimate.findMany({ where: orgWhere(orgId, {}) }),
    prisma.invoice.findMany({ where: orgWhere(orgId, {}) }),
    prisma.activity.findMany({ where: orgWhere(orgId, {}) }),
  ]);

  return {
    companies,
    contacts,
    leads,
    estimates,
    invoices,
    activities,
  };
}

async function buildExcelWorkbook(tables: Record<string, any[]>): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = COMPANY_NAME;
  wb.created = new Date();

  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Arial" };
  const headerFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  const headerAlignment: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center", wrapText: true };

  for (const [tableName, data] of Object.entries(tables)) {
    if (data.length === 0) continue;

    const sheetName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
    const ws = wb.addWorksheet(sheetName);

    // Gather all unique keys
    const allKeys = new Set<string>();
    data.forEach((item) => Object.keys(item).forEach((k) => allKeys.add(k)));
    const headers = Array.from(allKeys);

    // Header row
    const headerRow = ws.addRow(headers.map((h) => h.charAt(0).toUpperCase() + h.slice(1).replace(/([A-Z])/g, " $1").trim()));
    headerRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = headerAlignment;
      cell.border = {
        bottom: { style: "thin", color: { argb: "FF94A3B8" } },
      };
    });
    headerRow.height = 28;

    // Data rows
    data.forEach((item, rowIdx) => {
      const values = headers.map((h) => {
        const val = item[h];
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return JSON.stringify(val);
        return val;
      });
      const row = ws.addRow(values);

      // Alternating row colors
      if (rowIdx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } } as ExcelJS.FillPattern;
        });
      }

      row.eachCell((cell) => {
        cell.font = { size: 10, name: "Arial" };
        cell.alignment = { vertical: "middle", wrapText: false };
      });
    });

    // Auto-fit column widths (approximate)
    headers.forEach((h, idx) => {
      const col = ws.getColumn(idx + 1);
      let maxLen = h.length + 4;
      data.forEach((item) => {
        const val = item[h];
        const len = val ? String(typeof val === "object" ? JSON.stringify(val) : val).length : 0;
        maxLen = Math.max(maxLen, Math.min(len + 2, 50));
      });
      col.width = Math.max(maxLen, 10);
    });

    // Freeze header row
    ws.views = [{ state: "frozen", ySplit: 1 }];

    // Auto-filter
    if (headers.length > 0 && data.length > 0) {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: data.length + 1, column: headers.length },
      };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

async function buildSingleSheetExcel(data: any[], sheetName: string): Promise<Uint8Array> {
  return buildExcelWorkbook({ [sheetName]: data });
}

export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { orgId } = result;

    const type = req.nextUrl.searchParams.get("type") || "all";
    const format = req.nextUrl.searchParams.get("format") || "csv";
    const crmTables = await getCrmTables(orgId);
    const dateStr = new Date().toISOString().split("T")[0];

    // Excel format
    if (format === "xlsx") {
      if (type === "all") {
        const buffer = await buildExcelWorkbook(crmTables);
        return new Response(buffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="crm_export_all_${dateStr}.xlsx"`,
          },
        });
      } else if (crmTables[type]) {
        const buffer = await buildSingleSheetExcel(crmTables[type], type);
        return new Response(buffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${type}_export_${dateStr}.xlsx"`,
          },
        });
      }
    }

    // JSON format
    if (format === "json") {
      if (type === "all") {
        return NextResponse.json(crmTables, {
          headers: { "Content-Disposition": `attachment; filename="crm_export_${dateStr}.json"` },
        });
      } else if (crmTables[type]) {
        return NextResponse.json(crmTables[type], {
          headers: { "Content-Disposition": `attachment; filename="${type}_export_${dateStr}.json"` },
        });
      }
    }

    // CSV format (default)
    if (type !== "all" && crmTables[type]) {
      const csv = arrayToCsv(crmTables[type]);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${type}_export_${dateStr}.csv"`,
        },
      });
    }

    if (type === "all") {
      const sections: string[] = [];
      for (const [tableName, data] of Object.entries(crmTables)) {
        if (data.length === 0) continue;
        sections.push(`### ${tableName.toUpperCase()} ###`);
        sections.push(arrayToCsv(data));
        sections.push("");
      }
      const csv = sections.join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="crm_export_all_${dateStr}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: `Unknown type: ${type}. Available: ${Object.keys(crmTables).join(", ")}, all` }, { status: 400 });
  } catch (error: any) {
    logger.error("Export error:", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
