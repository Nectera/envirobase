// Real Prisma client with adapter wrappers for custom operators
// This replaces the JSON-backed custom ORM while maintaining API compatibility
// with all 149+ consuming files that import { prisma } from "@/lib/prisma"

import { PrismaClient } from "@prisma/client";

// ─── Singleton Pattern for Next.js ──────────────────────────────

const globalForPrisma = global as unknown as { __prisma: PrismaClient };

// Build a datasource URL that limits the connection pool for serverless.
// Supabase Session-mode pooler has a small pool_size; each Vercel
// function instance must open as few connections as possible.
function getDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const sep = url.includes("?") ? "&" : "?";
  // pgbouncer=true tells Prisma to use pgBouncer-compatible mode
  // connection_limit=1 ensures each serverless instance only opens 1 conn
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

// ─── Custom Operator Translators ────────────────────────────────

/** Translate { dateRange: { start, end } } → Prisma gte/lte on a single date field */
function translateDateRange(where: any, dateField: string) {
  if (!where?.dateRange) return where;
  const { start, end } = where.dateRange;
  const { dateRange: _, ...rest } = where;
  return { ...rest, [dateField]: { gte: start, lte: end } };
}

/** Translate { dateRange: { start, end } } → overlapping interval (startDate ≤ end AND endDate ≥ start) */
function translateDateRangeOverlap(where: any) {
  if (!where?.dateRange) return where;
  const { start, end } = where.dateRange;
  const { dateRange: _, ...rest } = where;
  return { ...rest, AND: [{ startDate: { lte: end } }, { endDate: { gte: start } }] };
}

/** Translate { statusIn: [...] } → Prisma { status: { in: [...] } } */
function translateStatusIn(where: any) {
  if (!where?.statusIn) return where;
  const { statusIn, ...rest } = where;
  return { ...rest, status: { in: statusIn } };
}

/** Translate { search: "term" } → Prisma OR with case-insensitive contains */
function translateSearch(where: any, fields: string[]) {
  if (!where?.search) return where;
  const q = where.search;
  const { search: _, ...rest } = where;
  return { ...rest, OR: fields.map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) };
}

// ─── Entity Wrappers ────────────────────────────────────────────
// Only entities that use custom operators need wrappers.
// Everything else passes through to the raw Prisma client.

const wrappers: Record<string, any> = {
  // ── Settings (key-value store, org-scoped) ──
  setting: {
    findUnique: async ({ where }: any) => {
      return rawPrisma.setting.findUnique({ where: { key: where.key } });
    },
    findMany: (opts?: any) => rawPrisma.setting.findMany(opts),
    upsert: async ({ where, data }: any) => {
      const val = typeof data.value === "string" ? data.value : JSON.stringify(data.value);
      return rawPrisma.setting.upsert({
        where: { key: where.key },
        update: { value: val },
        create: { key: where.key, value: val, organizationId: data.organizationId || null },
      });
    },
  },

  // ── CompanyInfo (singleton) ──
  companyInfo: {
    findFirst: async () => rawPrisma.companyInfo.findFirst(),
    create: (o: any) => rawPrisma.companyInfo.create(o),
    update: (o: any) => rawPrisma.companyInfo.update(o),
    upsert: async ({ data }: any) => {
      const existing = await rawPrisma.companyInfo.findFirst();
      if (existing) {
        return rawPrisma.companyInfo.update({ where: { id: existing.id }, data });
      }
      return rawPrisma.companyInfo.create({ data });
    },
  },

  // ── ComplianceCheck (composite key) ──
  complianceCheck: {
    findMany: (opts: any) => rawPrisma.complianceCheck.findMany(opts),
    upsert: async ({ where, update: upd, create: crt }: any) => {
      if (where?.projectId_itemKey) {
        return rawPrisma.complianceCheck.upsert({
          where: { projectId_itemKey: where.projectId_itemKey },
          update: upd,
          create: crt,
        });
      }
      throw new Error("complianceCheck.upsert requires projectId_itemKey");
    },
  },

  // ── ScheduleEntry (dateRange) ──
  scheduleEntry: {
    findMany: (opts?: any) => {
      const where = opts?.where ? translateDateRange(opts.where, "date") : undefined;
      return rawPrisma.scheduleEntry.findMany({ ...opts, where });
    },
    findUnique: (o: any) => rawPrisma.scheduleEntry.findUnique(o),
    create: (o: any) => rawPrisma.scheduleEntry.create(o),
    update: (o: any) => rawPrisma.scheduleEntry.update(o),
    delete: (o: any) => rawPrisma.scheduleEntry.delete(o),
  },

  // ── TimeEntry (dateRange + clockOut null check) ──
  timeEntry: {
    findMany: (opts?: any) => {
      let where = opts?.where ? translateDateRange(opts.where, "date") : undefined;
      return rawPrisma.timeEntry.findMany({ ...opts, where });
    },
    findUnique: (o: any) => rawPrisma.timeEntry.findUnique(o),
    create: (o: any) => rawPrisma.timeEntry.create(o),
    update: (o: any) => rawPrisma.timeEntry.update(o),
    delete: (o: any) => rawPrisma.timeEntry.delete(o),
    count: (o?: any) => rawPrisma.timeEntry.count(o),
  },

  // ── TimeOff (dateRange overlap) ──
  timeOff: {
    findMany: (opts?: any) => {
      const where = opts?.where ? translateDateRangeOverlap(opts.where) : undefined;
      return rawPrisma.timeOff.findMany({ ...opts, where });
    },
    findUnique: (o: any) => rawPrisma.timeOff.findUnique(o),
    create: (o: any) => rawPrisma.timeOff.create(o),
    update: (o: any) => rawPrisma.timeOff.update(o),
    delete: (o: any) => rawPrisma.timeOff.delete(o),
  },

  // ── CalendarEvent (dateRange overlap) ──
  calendarEvent: {
    findMany: (opts?: any) => {
      const where = opts?.where ? translateDateRangeOverlap(opts.where) : undefined;
      return rawPrisma.calendarEvent.findMany({ ...opts, where });
    },
    findUnique: (o: any) => rawPrisma.calendarEvent.findUnique(o),
    create: (o: any) => rawPrisma.calendarEvent.create(o),
    update: (o: any) => rawPrisma.calendarEvent.update(o),
    delete: (o: any) => rawPrisma.calendarEvent.delete(o),
  },

  // ── Company (search) ──
  company: {
    findMany: (opts?: any) => {
      const where = opts?.where ? translateSearch(opts.where, ["name", "city"]) : undefined;
      return rawPrisma.company.findMany({ ...opts, where });
    },
    findUnique: (o: any) => rawPrisma.company.findUnique(o),
    findFirst: (o: any) => rawPrisma.company.findFirst(o),
    create: (o: any) => rawPrisma.company.create(o),
    createMany: (o: any) => rawPrisma.company.createMany(o),
    update: (o: any) => rawPrisma.company.update(o),
    delete: (o: any) => rawPrisma.company.delete(o),
    deleteMany: (o?: any) => rawPrisma.company.deleteMany(o),
    count: (o?: any) => rawPrisma.company.count(o),
  },

  // ── Contact (search) ──
  contact: {
    findMany: (opts?: any) => {
      const where = opts?.where ? translateSearch(opts.where, ["firstName", "lastName", "email"]) : undefined;
      return rawPrisma.contact.findMany({ ...opts, where });
    },
    findUnique: (o: any) => rawPrisma.contact.findUnique(o),
    create: (o: any) => rawPrisma.contact.create(o),
    createMany: (o: any) => rawPrisma.contact.createMany(o),
    update: (o: any) => rawPrisma.contact.update(o),
    delete: (o: any) => rawPrisma.contact.delete(o),
    deleteMany: (o?: any) => rawPrisma.contact.deleteMany(o),
  },

  // ── Lead (statusIn) ──
  lead: {
    findMany: (opts?: any) => {
      const where = opts?.where ? translateStatusIn(opts.where) : undefined;
      return rawPrisma.lead.findMany({ ...opts, where });
    },
    findUnique: (o: any) => rawPrisma.lead.findUnique(o),
    findFirst: (o: any) => rawPrisma.lead.findFirst(o),
    create: (o: any) => rawPrisma.lead.create(o),
    createMany: (o: any) => rawPrisma.lead.createMany(o),
    update: (o: any) => rawPrisma.lead.update(o),
    updateMany: (o: any) => rawPrisma.lead.updateMany(o),
    delete: (o: any) => rawPrisma.lead.delete(o),
    deleteMany: (o?: any) => rawPrisma.lead.deleteMany(o),
    count: (o?: any) => rawPrisma.lead.count(o),
  },

  // ── Estimate (auto-generated estimateNumber) ──
  estimate: {
    findMany: (o?: any) => rawPrisma.estimate.findMany(o),
    findUnique: (o: any) => rawPrisma.estimate.findUnique(o),
    create: async (opts: any) => {
      if (!opts.data.estimateNumber) {
        const year = new Date().getFullYear();
        const count = await rawPrisma.estimate.count();
        opts.data.estimateNumber = `EST-${year}-${String(count + 1).padStart(3, "0")}`;
      }
      return rawPrisma.estimate.create(opts);
    },
    update: (o: any) => rawPrisma.estimate.update(o),
    delete: (o: any) => rawPrisma.estimate.delete(o),
    count: (o?: any) => rawPrisma.estimate.count(o),
  },

  // ── Task (auto completedAt) ──
  task: {
    findMany: (o?: any) => rawPrisma.task.findMany(o),
    findUnique: (o: any) => rawPrisma.task.findUnique(o),
    create: (o: any) => rawPrisma.task.create(o),
    update: async (opts: any) => {
      if (opts.data.status === "completed" && !opts.data.completedAt) {
        opts.data.completedAt = new Date().toISOString();
      } else if (opts.data.status && opts.data.status !== "completed") {
        opts.data.completedAt = null;
      }
      return rawPrisma.task.update(opts);
    },
    delete: (o: any) => rawPrisma.task.delete(o),
  },

  // ── Project (explicit cascade on delete) ──
  project: {
    findMany: (o?: any) => rawPrisma.project.findMany(o),
    findUnique: (o: any) => rawPrisma.project.findUnique(o),
    create: (o: any) => rawPrisma.project.create(o),
    update: (o: any) => rawPrisma.project.update(o),
    delete: async (opts: any) => {
      // Schema has onDelete: Cascade, but explicit cleanup for safety
      const pid = opts.where.id;
      await rawPrisma.projectTask.deleteMany({ where: { projectId: pid } });
      await rawPrisma.projectWorker.deleteMany({ where: { projectId: pid } });
      return rawPrisma.project.delete(opts);
    },
  },

  // ── ProjectTask (createMany) ──
  projectTask: {
    findMany: (o?: any) => rawPrisma.projectTask.findMany(o),
    createMany: (o: any) => rawPrisma.projectTask.createMany(o),
    update: (o: any) => rawPrisma.projectTask.update(o),
    delete: (o: any) => rawPrisma.projectTask.delete(o),
    deleteMany: (o: any) => rawPrisma.projectTask.deleteMany(o),
  },
  projectDocument: {
    findMany: (o: any) => rawPrisma.document.findMany(o),
    findUnique: (o: any) => rawPrisma.document.findUnique(o),
    create: (o: any) => rawPrisma.document.create(o),
    update: (o: any) => rawPrisma.document.update(o),
    delete: (o: any) => rawPrisma.document.delete(o),
    deleteMany: (o: any) => rawPrisma.document.deleteMany(o),
    count: (o: any) => rawPrisma.document.count(o),
  },
  knowledgeBaseArticle: {
    findMany: (o: any) => rawPrisma.knowledgeBase.findMany(o),
    findUnique: (o: any) => rawPrisma.knowledgeBase.findUnique(o),
    create: (o: any) => rawPrisma.knowledgeBase.create(o),
    update: (o: any) => rawPrisma.knowledgeBase.update(o),
    delete: (o: any) => rawPrisma.knowledgeBase.delete(o),
    count: (o: any) => rawPrisma.knowledgeBase.count(o),
  },
};

// ─── Integration Auth Helpers ───────────────────────────────────
// The old code accessed prisma-like quickbooksAuth, ringcentralAuth, etc.
// These are now stored in the IntegrationAuth table. We provide helper
// functions rather than Prisma-model wrappers.

export async function getIntegrationAuth(provider: string, organizationId?: string | null) {
  if (organizationId) {
    const record = await rawPrisma.integrationAuth.findFirst({
      where: { provider, organizationId },
    });
    return record ? (record.data as any) : null;
  }
  // Fallback for pre-migration: find by provider only
  const record = await rawPrisma.integrationAuth.findFirst({ where: { provider } });
  return record ? (record.data as any) : null;
}

export async function setIntegrationAuth(provider: string, data: any, organizationId?: string | null) {
  if (organizationId) {
    const existing = await rawPrisma.integrationAuth.findFirst({
      where: { provider, organizationId },
    });
    if (existing) {
      return rawPrisma.integrationAuth.update({
        where: { id: existing.id },
        data: { data },
      });
    }
    return rawPrisma.integrationAuth.create({
      data: { provider, data, organizationId },
    });
  }
  // Fallback for pre-migration
  return rawPrisma.integrationAuth.upsert({
    where: { id: provider }, // Will use the old unique constraint
    update: { data },
    create: { provider, data },
  });
}

export async function deleteIntegrationAuth(provider: string, organizationId?: string | null) {
  try {
    if (organizationId) {
      const existing = await rawPrisma.integrationAuth.findFirst({
        where: { provider, organizationId },
      });
      if (existing) {
        await rawPrisma.integrationAuth.delete({ where: { id: existing.id } });
      }
    } else {
      const existing = await rawPrisma.integrationAuth.findFirst({ where: { provider } });
      if (existing) {
        await rawPrisma.integrationAuth.delete({ where: { id: existing.id } });
      }
    }
  } catch {
    // Not found — ignore
  }
}

// ─── Proxy Export ───────────────────────────────────────────────
// The proxy intercepts property access: if a custom wrapper exists for
// the model name, it returns the wrapper. Otherwise it passes through
// to the real Prisma client. This means all standard Prisma calls
// (worker.findMany, alert.count, etc.) work automatically.

export const prisma: any = new Proxy(rawPrisma, {
  get(target: any, prop: string | symbol) {
    if (typeof prop === "string" && wrappers[prop]) {
      return wrappers[prop];
    }
    return target[prop];
  },
});

export default prisma;
