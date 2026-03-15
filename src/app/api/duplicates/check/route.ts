import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { __prisma: PrismaClient };

function getDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const sep = url.includes("?") ? "&" : "?";
  if (url.includes("connection_limit")) return url;
  return `${url}${sep}pgbouncer=true&connection_limit=1`;
}

const rawPrisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: { url: getDatasourceUrl() },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = rawPrisma;

export const dynamic = "force-dynamic";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const sp = req.nextUrl.searchParams;
    const type = sp.get("type"); // lead, contact, company
    const firstName = sp.get("firstName")?.trim() || "";
    const lastName = sp.get("lastName")?.trim() || "";
    const email = sp.get("email")?.trim().toLowerCase() || "";
    const phone = sp.get("phone")?.trim() || "";
    const companyName = sp.get("companyName")?.trim() || "";
    const excludeId = sp.get("excludeId") || ""; // exclude current record when editing

    if (!type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    const matches: any[] = [];

    // ── Company duplicate check ──
    if (type === "company" && companyName) {
      const companies = await rawPrisma.company.findMany({
        where: {
          ...orgWhere(orgId),
          name: { contains: companyName, mode: "insensitive" },
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        take: 5,
        select: { id: true, name: true, city: true, state: true, phone: true, email: true, type: true },
      });

      for (const c of companies) {
        const matchedFields: string[] = [];
        const nameMatch = (c.name || "").toLowerCase() === companyName.toLowerCase();
        if (nameMatch) matchedFields.push("name (exact)");
        else matchedFields.push("name (similar)");

        matches.push({
          id: c.id,
          type: "company",
          name: c.name,
          email: c.email,
          phone: c.phone,
          subtitle: [c.city, c.state].filter(Boolean).join(", "),
          companyType: c.type,
          matchedFields,
        });
      }
    }

    // ── Contact duplicate check ──
    if (type === "contact") {
      const conditions: any[] = [];

      if (email) {
        conditions.push({ email: { equals: email, mode: "insensitive" } });
      }
      if (phone) {
        const normalized = normalizePhone(phone);
        if (normalized.length >= 7) {
          // Search for phone containing the digits
          conditions.push({ phone: { contains: normalized.slice(-7) } });
        }
      }
      if (firstName && lastName) {
        conditions.push({
          AND: [
            { firstName: { equals: firstName, mode: "insensitive" } },
            { lastName: { equals: lastName, mode: "insensitive" } },
          ],
        });
      }

      if (conditions.length > 0) {
        const contacts = await rawPrisma.contact.findMany({
          where: {
            ...orgWhere(orgId),
            OR: conditions,
            ...(excludeId ? { NOT: { id: excludeId } } : {}),
          },
          take: 5,
          include: { company: { select: { id: true, name: true } } },
        });

        for (const c of contacts) {
          const matchedFields: string[] = [];
          if (email && (c.email || "").toLowerCase() === email) matchedFields.push("email");
          if (phone && normalizePhone(c.phone || "").includes(normalizePhone(phone).slice(-7))) matchedFields.push("phone");
          if (firstName && lastName &&
            (c.firstName || "").toLowerCase() === firstName.toLowerCase() &&
            (c.lastName || "").toLowerCase() === lastName.toLowerCase()) matchedFields.push("name");

          matches.push({
            id: c.id,
            type: "contact",
            name: [c.firstName, c.lastName].filter(Boolean).join(" "),
            email: c.email,
            phone: c.phone,
            subtitle: (c as any).company?.name || "",
            companyId: (c as any).company?.id || null,
            companyName: (c as any).company?.name || null,
            matchedFields,
          });
        }
      }
    }

    // ── Lead duplicate check ──
    if (type === "lead") {
      const conditions: any[] = [];

      if (email) {
        conditions.push({ email: { equals: email, mode: "insensitive" } });
      }
      if (phone) {
        const normalized = normalizePhone(phone);
        if (normalized.length >= 7) {
          conditions.push({ phone: { contains: normalized.slice(-7) } });
        }
      }
      if (firstName && lastName) {
        conditions.push({
          AND: [
            { firstName: { equals: firstName, mode: "insensitive" } },
            { lastName: { equals: lastName, mode: "insensitive" } },
          ],
        });
      }

      if (conditions.length > 0) {
        const leads = await rawPrisma.lead.findMany({
          where: {
            ...orgWhere(orgId),
            OR: conditions,
            ...(excludeId ? { NOT: { id: excludeId } } : {}),
          },
          take: 5,
          include: {
            company: { select: { id: true, name: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        for (const l of leads) {
          const matchedFields: string[] = [];
          if (email && (l.email || "").toLowerCase() === email) matchedFields.push("email");
          if (phone && normalizePhone(l.phone || "").includes(normalizePhone(phone).slice(-7))) matchedFields.push("phone");
          if (firstName && lastName &&
            (l.firstName || "").toLowerCase() === firstName.toLowerCase() &&
            (l.lastName || "").toLowerCase() === lastName.toLowerCase()) matchedFields.push("name");

          matches.push({
            id: l.id,
            type: "lead",
            name: [l.firstName, l.lastName].filter(Boolean).join(" "),
            email: l.email,
            phone: l.phone,
            subtitle: [l.address, l.city, l.state].filter(Boolean).join(", "),
            companyId: (l as any).company?.id || null,
            companyName: (l as any).company?.name || null,
            contactId: (l as any).contact?.id || null,
            contactName: (l as any).contact
              ? [(l as any).contact.firstName, (l as any).contact.lastName].filter(Boolean).join(" ")
              : null,
            status: l.status,
            matchedFields,
          });
        }
      }
    }

    return NextResponse.json({ matches, hasMatches: matches.length > 0 });
  } catch (error: any) {
    console.error("[Duplicate Check Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
