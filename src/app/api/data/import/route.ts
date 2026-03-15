import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for large imports


const VALID_TYPES = ["companies", "contacts", "leads", "estimates", "invoices", "activities"] as const;
type CrmType = (typeof VALID_TYPES)[number];

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

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

async function parseExcel(buffer: ArrayBuffer): Promise<Record<string, any>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws || ws.rowCount < 2) return [];

  // Get raw headers (keep original names for mapping)
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    headers[colNum - 1] = cell.value ? String(cell.value).trim() : `col${colNum}`;
  });

  const rows: Record<string, any>[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
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
      record[key] = val === null || val === undefined ? "" : val;
    });
    if (Object.values(record).every((v) => v === "" || v === null || v === undefined)) continue;
    rows.push(record);
  }

  return rows;
}

// Map external data formats (like Copper CRM) to Xtract fields
function mapToXtractSchema(rows: Record<string, any>[], type: CrmType): Record<string, any>[] {
  return rows.map((row) => {
    const mapped: Record<string, any> = {};

    // Normalize keys to lowercase for matching
    const lowerRow: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      lowerRow[k.toLowerCase()] = v;
    }

    if (type === "contacts") {
      // Build firstName/lastName from available fields
      const rawFirst = lowerRow["first name"] || lowerRow["firstname"] || "";
      const rawLast = lowerRow["last name"] || lowerRow["lastname"] || "";
      const fullName = lowerRow["name"] || lowerRow["full name"] || lowerRow["fullname"] || "";
      if (rawFirst || rawLast) {
        mapped.firstName = rawFirst || fullName;
        mapped.lastName = rawLast || null;
      } else if (fullName) {
        const parts = fullName.trim().split(/\s+/);
        mapped.firstName = parts[0];
        mapped.lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
      } else {
        mapped.firstName = "Unknown";
        mapped.lastName = null;
      }
      mapped.name = [mapped.firstName, mapped.lastName].filter(Boolean).join(" ");

      mapped.title = lowerRow["title"] || lowerRow["job title"] || lowerRow["jobtitle"] || "";
      mapped.email = lowerRow["email"] || lowerRow["email address"] || "";
      mapped.phone = lowerRow["phone"] || lowerRow["phone number"] || lowerRow["phonenumber"] || "";
      mapped.address = lowerRow["street"] || lowerRow["address"] || "";
      mapped.city = lowerRow["city"] || "";
      mapped.state = lowerRow["state"] || lowerRow["state/province"] || "";
      mapped.zip = lowerRow["zip"] || lowerRow["postal code"] || lowerRow["postalcode"] || lowerRow["zipcode"] || "";
      mapped.companyName = lowerRow["company"] || lowerRow["company name"] || lowerRow["companyname"] || "";
      mapped.type = lowerRow["contact type"] || lowerRow["contacttype"] || lowerRow["type"] || "";
      mapped.tags = lowerRow["tags"] || "";
      mapped.source = lowerRow["lead from"] || lowerRow["referred by"] || lowerRow["source"] || "";
      mapped.notes = lowerRow["details"] || lowerRow["notes"] || lowerRow["project notes"] || "";

      // Preserve additional useful fields
      if (lowerRow["email 2"]) mapped.email2 = lowerRow["email 2"];
      if (lowerRow["phone number 2"]) mapped.phone2 = lowerRow["phone number 2"];
      if (lowerRow["website"]) mapped.website = lowerRow["website"];

      // Preserve original timestamps if present
      if (lowerRow["created at"] || lowerRow["createdat"]) {
        mapped.originalCreatedAt = lowerRow["created at"] || lowerRow["createdat"];
      }

      // Copper CRM specific
      if (lowerRow["copper id"]) mapped.externalId = String(lowerRow["copper id"]);
      if (lowerRow["copper url"]) mapped.externalUrl = lowerRow["copper url"];

      // Insurance fields
      if (lowerRow["insurance carrier cf_469166"]) mapped.insuranceCarrier = lowerRow["insurance carrier cf_469166"];
      if (lowerRow["adjuster name cf_469167"]) mapped.adjusterName = lowerRow["adjuster name cf_469167"];
      if (lowerRow["adjuster phone number cf_469168"]) mapped.adjusterPhone = lowerRow["adjuster phone number cf_469168"];
      if (lowerRow["adjuster email cf_469169"]) mapped.adjusterEmail = lowerRow["adjuster email cf_469169"];
      if (lowerRow["claim # cf_469170"]) mapped.claimNumber = lowerRow["claim # cf_469170"];
    } else if (type === "companies") {
      mapped.name = lowerRow["name"] || lowerRow["company"] || lowerRow["company name"] || lowerRow["companyname"] || "";
      mapped.type = lowerRow["type"] || lowerRow["company type"] || "";
      mapped.address = lowerRow["street"] || lowerRow["address"] || "";
      mapped.city = lowerRow["city"] || "";
      mapped.state = lowerRow["state"] || "";
      mapped.zip = lowerRow["zip"] || lowerRow["postal code"] || "";
      mapped.phone = lowerRow["phone"] || lowerRow["phone number"] || "";
      mapped.email = lowerRow["email"] || "";
      mapped.website = lowerRow["website"] || "";
      mapped.notes = lowerRow["details"] || lowerRow["notes"] || "";
    } else if (type === "leads") {
      // Build lead title from name fields if no explicit lead name
      const leadTitle = lowerRow["lead name"] || lowerRow["name"] || "";
      const firstName = lowerRow["first name"] || lowerRow["firstname"] || "";
      const lastName = lowerRow["last name"] || lowerRow["lastname"] || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

      // Title = lead name, or if importing people data as leads, use the full name
      mapped.title = leadTitle || fullName || lowerRow["company"] || lowerRow["company name"] || "";

      // Contact info (leads have firstName/lastName directly)
      if (firstName) mapped.firstName = firstName;
      if (lastName) mapped.lastName = lastName;
      mapped.email = lowerRow["email"] || lowerRow["email address"] || "";
      mapped.phone = lowerRow["phone"] || lowerRow["phone number"] || lowerRow["phonenumber"] || "";
      mapped.address = lowerRow["street"] || lowerRow["address"] || "";
      mapped.city = lowerRow["city"] || "";
      mapped.state = lowerRow["state"] || lowerRow["state/province"] || "";

      // Lead-specific fields
      mapped.description = lowerRow["description"] || lowerRow["details"] || lowerRow["scope of project cf_563194"] || lowerRow["project notes cf_563193"] || lowerRow["notes"] || "";
      const rawStatus = lowerRow["status"] || lowerRow["active/closed cf_489379"] || "new";
      // Map Copper CRM statuses to Xtract pipeline stages
      const statusLower = String(rawStatus).toLowerCase().replace(/\s+/g, "_");
      const STATUS_MAP: Record<string, string> = {
        // Copper CRM closed/inactive statuses → lost
        closed: "lost",
        unqualified: "lost",
        referred: "lost",
        // Copper CRM active statuses → Xtract pipeline stages
        active: "new",
        open: "new",
        new: "new",
        contacted: "contacted",
        site_visit: "site_visit",
        proposal_sent: "proposal_sent",
        negotiation: "negotiation",
        won: "won",
        lost: "lost",
      };
      mapped.status = STATUS_MAP[statusLower] || statusLower;
      mapped.estimatedValue = lowerRow["amount"] || lowerRow["value"] || lowerRow["monetary value"] || "";
      mapped.source = lowerRow["source"] || lowerRow["lead from cf_698539"] || lowerRow["lead source"] || lowerRow["referred by cf_533538"] || "";
      mapped.notes = lowerRow["project notes cf_563193"] || lowerRow["notes"] || "";

      // Job title goes to a different field, not the lead title
      if (lowerRow["title"]) mapped.jobTitle = lowerRow["title"];

      // Company name (for display, not linked by ID)
      const companyName = lowerRow["company"] || lowerRow["company name"] || "";
      if (companyName) mapped.companyName = companyName;

      // Insurance fields (common in Xtract's industry)
      if (lowerRow["insurance carrier cf_469166"]) mapped.insuranceCarrier = lowerRow["insurance carrier cf_469166"];
      if (lowerRow["adjuster name cf_469167"]) mapped.adjusterName = lowerRow["adjuster name cf_469167"];
      if (lowerRow["adjuster phone number cf_469168"]) mapped.adjusterPhone = lowerRow["adjuster phone number cf_469168"];
      if (lowerRow["adjuster email cf_469169"]) mapped.adjusterEmail = lowerRow["adjuster email cf_469169"];
      if (lowerRow["claim # cf_469170"]) mapped.claimNumber = lowerRow["claim # cf_469170"];
      if (lowerRow["date of loss cf_469171"]) mapped.dateOfLoss = lowerRow["date of loss cf_469171"];
      if (lowerRow["job type cf_603092"]) mapped.projectType = String(lowerRow["job type cf_603092"]).toUpperCase().replace(/\s+/g, "_");

      // Copper CRM specific
      if (lowerRow["copper id"]) mapped.externalId = String(lowerRow["copper id"]);
      if (lowerRow["copper url"]) mapped.externalUrl = lowerRow["copper url"];

      // Preserve original timestamps
      if (lowerRow["created at"] || lowerRow["createdat"]) {
        mapped.originalCreatedAt = lowerRow["created at"] || lowerRow["createdat"];
      }
    } else if (type === "estimates") {
      mapped.estimateNumber = lowerRow["estimatenumber"] || lowerRow["estimate number"] || lowerRow["estimate #"] || "";
      mapped.status = String(lowerRow["status"] || "draft").toLowerCase().replace(/\s+/g, "_");
      mapped.total = lowerRow["total"] || lowerRow["amount"] || "";
    } else if (type === "invoices") {
      mapped.invoiceNumber = lowerRow["invoicenumber"] || lowerRow["invoice number"] || lowerRow["invoice #"] || "";
      mapped.status = String(lowerRow["status"] || "draft").toLowerCase().replace(/\s+/g, "_");
      mapped.total = lowerRow["total"] || lowerRow["amount"] || "";
    } else if (type === "activities") {
      mapped.type = lowerRow["type"] || lowerRow["activity type"] || "";
      mapped.title = lowerRow["title"] || lowerRow["subject"] || lowerRow["name"] || "";
      mapped.description = lowerRow["description"] || lowerRow["details"] || lowerRow["notes"] || "";
      mapped.date = lowerRow["date"] || lowerRow["activity date"] || "";
    }

    // Remove empty string values to keep records clean
    for (const [k, v] of Object.entries(mapped)) {
      if (v === "" || v === null || v === undefined) delete mapped[k];
    }

    return mapped;
  });
}

const REQUIRED_FIELDS: Record<CrmType, string[]> = {
  companies: ["name"],
  contacts: ["firstName"],
  leads: ["title"],
  estimates: ["estimateNumber"],
  invoices: ["invoiceNumber"],
  activities: ["type", "title"],
};

function validateRow(row: Record<string, any>, type: CrmType, rowIndex: number): string | null {
  // Leads can be identified by title OR firstName (for people imports)
  if (type === "leads") {
    const hasTitle = row.title && (typeof row.title !== "string" || row.title.trim());
    const hasFirstName = row.firstName && (typeof row.firstName !== "string" || row.firstName.trim());
    if (!hasTitle && !hasFirstName) {
      return `Row ${rowIndex + 1}: missing required field "title" or "firstName"`;
    }
    return null;
  }

  const required = REQUIRED_FIELDS[type];
  for (const field of required) {
    const val = row[field];
    if (val === null || val === undefined || (typeof val === "string" && !val.trim())) {
      return `Row ${rowIndex + 1}: missing required field "${field}"`;
    }
  }
  return null;
}

function processRows(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map((row) => {
    const processed: Record<string, any> = { ...row };
    // Only add id — let Prisma handle createdAt (@default(now())) and updatedAt (@updatedAt)
    if (!processed.id) processed.id = randomUUID();
    // Remove createdAt/updatedAt so Prisma uses its defaults
    delete processed.createdAt;
    delete processed.updatedAt;

    // Ensure all values are primitives Prisma can handle
    for (const [key, val] of Object.entries(processed)) {
      if (val === null || val === undefined) continue;
      // Convert any remaining objects to strings (e.g. ExcelJS rich text, formula results)
      if (typeof val === "object") {
        if (val instanceof Date) {
          processed[key] = val.toISOString();
        } else {
          processed[key] = String(val);
        }
      }
    }
    return processed;
  });
}

export async function POST(req: NextRequest) {
  let step = "init";
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { orgId } = result;

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;
    const mode = (formData.get("mode") as string) || "append";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!type || !VALID_TYPES.includes(type as CrmType)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    let rawRows: Record<string, any>[];

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      rawRows = await parseExcel(buffer);
    } else {
      const text = await file.text();
      rawRows = parseCsv(text);
    }

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 });
    }

    // Check if custom field mapping was provided
    const fieldMappingRaw = formData.get("fieldMapping") as string | null;
    let rows: Record<string, any>[];

    if (fieldMappingRaw) {
      // Use custom field mapping from the user
      const fieldMapping: Record<string, string> = JSON.parse(fieldMappingRaw);
      rows = rawRows.map((row) => {
        const mapped: Record<string, any> = {};
        for (const [sourceField, xtractField] of Object.entries(fieldMapping)) {
          if (xtractField && xtractField !== "__skip__" && row[sourceField] !== undefined && row[sourceField] !== "") {
            // If multiple source fields map to the same target, concatenate with space
            if (mapped[xtractField] !== undefined && mapped[xtractField] !== "") {
              mapped[xtractField] = mapped[xtractField] + " " + row[sourceField];
            } else {
              mapped[xtractField] = row[sourceField];
            }
          }
        }
        // Remove empty string values
        for (const [k, v] of Object.entries(mapped)) {
          if (v === "" || v === null || v === undefined) delete mapped[k];
        }
        return mapped;
      });
    } else {
      // Fallback: check if data already matches Xtract schema or needs auto-mapping
      const firstRow = rawRows[0];
      const hasNativeFields = REQUIRED_FIELDS[type as CrmType].some((f) => f in firstRow);

      if (hasNativeFields) {
        rows = rawRows;
      } else {
        rows = mapToXtractSchema(rawRows, type as CrmType);
      }
    }

    // Filter out rows that have no required fields (completely unmappable)
    const validRows: Record<string, any>[] = [];
    const errors: string[] = [];
    rows.forEach((row, idx) => {
      const err = validateRow(row, type as CrmType, idx);
      if (err) {
        errors.push(err);
      } else {
        validRows.push(row);
      }
    });

    // If majority of rows fail, something is wrong with the mapping
    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: `No valid rows found. The file headers don't match the expected format for ${type}.`,
          details: errors.slice(0, 10),
        },
        { status: 400 }
      );
    }

    step = "processRows";
    const processedRows = processRows(validRows);

    // Map type to Prisma model name
    const modelMap: Record<string, string> = {
      companies: "company",
      contacts: "contact",
      leads: "lead",
      estimates: "estimate",
      invoices: "invoice",
      activities: "activity",
    };
    const modelName = modelMap[type];

    // Valid schema fields per model — strip any fields Prisma doesn't know about
    const VALID_LEAD_FIELDS = new Set([
      "id", "companyId", "contactId", "firstName", "lastName", "email", "phone",
      "title", "description", "status", "projectType", "source", "estimatedValue",
      "notes", "address", "city", "state", "zip", "locationNotes",
      "isInsuranceJob", "insuranceCarrier", "claimNumber", "adjusterName",
      "adjusterPhone", "adjusterEmail", "dateOfLoss",
      "siteVisitDate", "siteVisitTime", "siteVisitNotes",
      "wonDate", "lostDate", "lostReason", "pipelineStage", "projectId",
      "office", "projectStartDate", "referralSource", "assignedTo",
      "createdAt", "updatedAt",
    ]);

    // For leads, sanitize all rows for Prisma/SQL compatibility
    if (type === "leads") {
      step = "leadSanitization";
      for (const row of processedRows) {
        // Strip any fields not in the Lead schema
        for (const key of Object.keys(row)) {
          if (!VALID_LEAD_FIELDS.has(key)) {
            delete row[key];
          }
        }
        // Also remove createdAt/updatedAt — let DB defaults handle these
        delete row.createdAt;
        delete row.updatedAt;

        // Ensure boolean fields are proper booleans
        if (row.isInsuranceJob !== undefined) {
          row.isInsuranceJob = row.isInsuranceJob === true || row.isInsuranceJob === "true" || row.isInsuranceJob === "1" || row.isInsuranceJob === 1;
        } else {
          row.isInsuranceJob = false;
        }

        // Ensure estimatedValue is a number or null
        if (row.estimatedValue !== undefined) {
          const val = parseFloat(String(row.estimatedValue).replace(/[,$]/g, ""));
          row.estimatedValue = isNaN(val) ? null : val;
        }

        // Normalize status to lowercase
        if (row.status && typeof row.status === "string") {
          row.status = row.status.toLowerCase().replace(/\s+/g, "_");
        }
        if (!row.status) row.status = "new";

        // Ensure ALL non-special fields are proper strings
        for (const key of Object.keys(row)) {
          if (key === "id" || key === "estimatedValue" || key === "isInsuranceJob") continue;
          const v = row[key];
          if (v === null || v === undefined) {
            delete row[key]; // Remove nulls to let DB defaults apply
            continue;
          }
          if (v instanceof Date) {
            row[key] = v.toISOString();
          } else if (typeof v === "number") {
            row[key] = String(v);
          } else if (typeof v === "object") {
            row[key] = String(v);
          }
        }
      }
    }

    // For contacts, sanitize rows — ensure firstName/lastName/name are set
    if (type === "contacts") {
      step = "contactSanitization";
      const VALID_CONTACT_FIELDS = new Set([
        "id", "companyId", "firstName", "lastName", "name", "title", "email", "phone", "address", "city", "state", "zip", "notes",
      ]);

      // Resolve companyName → companyId by looking up existing companies
      const companyNames = Array.from(new Set(processedRows.map((r) => r.companyName).filter(Boolean)));
      const companyMap: Record<string, string> = {};
      if (companyNames.length > 0) {
        // Batch lookup companies by name
        const companies = await prisma.company.findMany({
          where: orgWhere(orgId, { name: { in: companyNames } }),
          select: { id: true, name: true },
        });
        for (const c of companies) {
          companyMap[c.name.toLowerCase()] = c.id;
        }
      }

      for (const row of processedRows) {
        // Link to company by name if companyId not already set
        if (row.companyName && !row.companyId) {
          const matchId = companyMap[String(row.companyName).toLowerCase()];
          if (matchId) row.companyId = matchId;
        }

        // Strip unknown fields
        for (const key of Object.keys(row)) {
          if (!VALID_CONTACT_FIELDS.has(key)) delete row[key];
        }
        delete row.createdAt;
        delete row.updatedAt;

        // Ensure firstName is set — split name if only name exists
        if (!row.firstName && row.name) {
          const parts = String(row.name).trim().split(/\s+/);
          row.firstName = parts[0];
          row.lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
        }
        if (!row.firstName) row.firstName = "Unknown";

        // Compute name from firstName + lastName for backward compat
        row.name = [row.firstName, row.lastName].filter(Boolean).join(" ");

        // Convert remaining values to strings
        for (const key of Object.keys(row)) {
          if (key === "id") continue;
          const v = row[key];
          if (v === null || v === undefined) { delete row[key]; continue; }
          if (v instanceof Date) row[key] = v.toISOString();
          else if (typeof v === "number") row[key] = String(v);
          else if (typeof v === "object") row[key] = String(v);
        }
      }
    }

    // For companies, sanitize rows — only allow actual Company schema fields
    if (type === "companies") {
      step = "companySanitization";
      const VALID_COMPANY_FIELDS = new Set([
        "id", "name", "type", "phone", "email", "website", "address", "city", "state", "zip", "notes",
      ]);
      for (const row of processedRows) {
        // Strip unknown fields
        for (const key of Object.keys(row)) {
          if (!VALID_COMPANY_FIELDS.has(key)) delete row[key];
        }
        delete row.createdAt;
        delete row.updatedAt;

        // Ensure name exists
        if (!row.name) row.name = "Unknown Company";

        // Convert all values to strings (Company schema is all String/String? fields)
        for (const key of Object.keys(row)) {
          if (key === "id") continue;
          const v = row[key];
          if (v === null || v === undefined) { delete row[key]; continue; }
          if (v instanceof Date) row[key] = v.toISOString();
          else if (typeof v === "number") row[key] = String(v);
          else if (typeof v === "object") row[key] = String(v);
        }
      }
    }

    step = "dbInsert";

    if (mode === "replace") {
      if (type === "leads") await prisma.lead.deleteMany({});
      else if (type === "companies") await prisma.company.deleteMany({});
      else if (type === "contacts") await prisma.contact.deleteMany({});
    }

    // Insert using direct Prisma model calls (not dynamic access which breaks in Vercel minification)
    let importedCount = 0;
    const batchErrors: string[] = [];
    const BATCH_SIZE = 100;

    for (let i = 0; i < processedRows.length; i += BATCH_SIZE) {
      const batch = processedRows.slice(i, i + BATCH_SIZE);
      try {
        let result: { count: number };
        if (type === "leads") {
          result = await prisma.lead.createMany({ data: batch as any, skipDuplicates: true });
        } else if (type === "companies") {
          result = await prisma.company.createMany({ data: batch as any, skipDuplicates: true });
        } else if (type === "contacts") {
          result = await prisma.contact.createMany({ data: batch as any, skipDuplicates: true });
        } else {
          // Fallback for other types — use raw SQL
          result = { count: 0 };
        }
        importedCount += result.count;
      } catch (batchError: any) {
        const errMsg = batchError?.message || String(batchError);
        batchErrors.push(`Rows ${i + 1}-${i + batch.length}: ${errMsg.substring(0, 200)}`);
        logger.error(`Import batch error:`, { error: errMsg.substring(0, 300), sampleRow: JSON.stringify(batch[0]).substring(0, 300) });
      }
    }

    const skipped = rows.length - validRows.length;

    return NextResponse.json({
      success: importedCount > 0 || batchErrors.length === 0,
      imported: importedCount,
      skipped,
      total: rows.length,
      mode,
      type,
      errors: batchErrors.length > 0 ? batchErrors.slice(0, 5) : undefined,
    });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    const errMeta = error?.meta || null;
    logger.error("Import error:", { error: errMsg, meta: errMeta, step });
    return NextResponse.json({ error: `Import failed at ${step}: ${errMsg}` }, { status: 500 });
  }
}
