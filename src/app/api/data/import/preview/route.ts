import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): { headers: string[]; sampleRows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 1) return { headers: [], sampleRows: [] };
  const headers = parseCsvLine(lines[0]);
  const sampleRows: Record<string, string>[] = [];
  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    sampleRows.push(row);
  }
  return { headers, sampleRows };
}

async function parseExcelPreview(buffer: ArrayBuffer): Promise<{ headers: string[]; sampleRows: Record<string, any>[]; totalRows: number }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws || ws.rowCount < 1) return { headers: [], sampleRows: [], totalRows: 0 };

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    headers[colNum - 1] = cell.value ? String(cell.value).trim() : `col${colNum}`;
  });

  const sampleRows: Record<string, any>[] = [];
  for (let r = 2; r <= Math.min(ws.rowCount, 6); r++) {
    const row = ws.getRow(r);
    if (!row.hasValues) continue;
    const record: Record<string, any> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const key = headers[colNum - 1];
      if (!key) return;
      let val = cell.value;
      if (val && typeof val === "object" && "richText" in (val as any)) {
        val = (val as any).richText.map((rt: any) => rt.text).join("");
      }
      if (val instanceof Date) {
        val = val.toISOString();
      }
      if (val && typeof val === "object" && "result" in (val as any)) {
        val = (val as any).result;
      }
      record[key] = val === null || val === undefined ? "" : String(val);
    });
    sampleRows.push(record);
  }

  // Count actual data rows (excluding header and empty rows)
  let dataRowCount = 0;
  for (let r = 2; r <= ws.rowCount; r++) {
    if (ws.getRow(r).hasValues) dataRowCount++;
  }

  return { headers, sampleRows, totalRows: dataRowCount };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    let totalRows = 0;

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      const result = await parseExcelPreview(buffer);

      if (result.headers.length === 0) {
        return NextResponse.json({ error: "File is empty or has no headers" }, { status: 400 });
      }

      return NextResponse.json({
        headers: result.headers,
        sampleRows: result.sampleRows,
        totalRows: result.totalRows,
        fileName: file.name,
      });
    }

    // CSV path
    const text = await file.text();
    const result = parseCsv(text);

    if (result.headers.length === 0) {
      return NextResponse.json({ error: "File is empty or has no headers" }, { status: 400 });
    }

    totalRows = text.split(/\r?\n/).filter((l) => l.trim()).length - 1;

    return NextResponse.json({
      headers: result.headers,
      sampleRows: result.sampleRows,
      totalRows,
      fileName: file.name,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
