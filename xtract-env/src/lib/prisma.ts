import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { __prisma: PrismaClient };

const rawPrisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = rawPrisma;

function translateDateRange(where: any, dateField: string) {
  if (!where?.dateRange) return where;
  const { start, end } = where.dateRange;
  const { dateRange: _, ...rest } = where;
  return { ...rest, [dateField]: { gte: start, lte: end } };
}

function translateDateRangeOverlap(where: any) {
  if (!where?.dateRange) return where;
  const { start, end } = where.dateRange;
  const { dateRange: _, ...rest } = where;
  return { ...rest, AND: [{ startDate: { lte: end } }, { endDate: { gte: start } }] };
}

function translateStatusIn(where: any) {
  if (!where?.statusIn) return where;
  const { statusIn, ...rest } = where;
  return { ...rest, status: { in: statusIn } };
}

function translateSearch(where: any, fields: string[]) {
  if (!where?.search) return where;
  const q = where.search;
  const { search: _, ...rest } = where;
  return { ...rest, OR: fields.map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) };
}

const wrappers: Record<string, any> = {
  setting: {
    findUnique: async ({ where }: any) => rawPrisma.setting.findUnique({ where: { key: where.key } }),
    upsert: async ({ where, data }: any) => {
      const val = typeof data.value === "string" ? data.value : JSON.stringify(data.value);
      return rawPrisma.setting.upsert({ where: { key: where.key }, update: { value: val }, create: { key: where.key, value: val } });
    },
  },
  companyInfo: {
    findFirst: async () => rawPrisma.companyInfo.findFirst(),
    upsert: async ({ data }: any) => {
      const existing = await rawPrisma.companyInfo.findFirst();
      if (existing) return rawPrisma.companyInfo.update({ where: { id: existing.id }, data });
      return rawPrisma.companyInfo.create({ data });
    },
  },
  complianceCheck: {
    findMany: (opts: any) => rawPrisma.complianceCheck.findMany(opts),
    upsert: async ({ where, update: upd, create: crt }: any) => {
      if (where?.projectId_itemKey) return rawPrisma.complianceCheck.upsert({ where: { projectId_itemKey: where.projectId_itemKey }, update: upd, create: crt });
      throw new Error("complianceCheck.upsert requires projectId_itemKey");
    },
  },
  scheduleEntry: {
    findMany: (opts?: any) => { const where = opts?.where ? translateDateRange(opts.where, "date") : undefined; return rawPrisma.scheduleEntry.findMany({ ...opts, where }); },
    findUnique: (o: any) => rawPrisma.scheduleEntry.findUnique(o),
    create: (o: any) => rawPrisma.scheduleEntry.create(o),
    update: (o: any) => rawPrisma.scheduleEntry.update(o),
    delete: (o: any) => rawPrisma.scheduleEntry.delete(o),
  },
  timeEntry: {
    findMany: (opts?: any) => { const where = opts?.where ? translateDateRange(opts.where, "date") : undefined; return rawPrisma.timeEntry.findMany({ ...opts, where }); },
    findUnique: (o: any) => rawPrisma.timeEntry.findUnique(o),
    create: (o: any) => rawPrisma.timeEntry.create(o),
    update: (o: any) => rawPrisma.timeEntry.update(o),
    delete: (o: any) => rawPrisma.timeEntry.delete(o),
    count: (o?: any) => rawPrisma.timeEntry.count(o),
  },
  timeOff: {
    findMany: (opts?: any) => { const where = opts?.where ? translateDateRangeOverlap(opts.where) : undefined; return rawPrisma.timeOff.findMany({ ...opts, where }); },
    findUnique: (o: any) => rawPrisma.timeOff.findUnique(o),
    create: (o: any) => rawPrisma.timeOff.create(o),
    update: (o: any) => rawPrisma.timeOff.update(o),
    delete: (o: any) => rawPrisma.timeOff.delete(o),
  },
  calendarEvent: {
    findMany: (opts?: any) => { const where = opts?.where ? translateDateRangeOverlap(opts.where) : undefined; return rawPrisma.calendarEvent.findMany({ ...opts, where }); },
    findUnique: (o: any) => rawPrisma.calendarEvent.findUnique(o),
    create: (o: any) => rawPrisma.calendarEvent.create(o),
    update: (o: any) => rawPrisma.calendarEvent.update(o),
    delete: (o: any) => rawPrisma.calendarEvent.delete(o),
  },
  company: {
    findMany: (opts?: any) => { const where = opts?.where ? translateSearch(opts.where, ["name", "city"]) : undefined; return rawPrisma.company.findMany({ ...opts, where }); },
    findUnique: (o: any) => rawPrisma.company.findUnique(o),
    create: (o: any) => rawPrisma.company.create(o),
    update: (o: any) => rawPrisma.company.update(o),
    delete: (o: any) => rawPrisma.company.delete(o),
    count: (o?: any) => rawPrisma.company.count(o),
  },
  contact: {
    findMany: (opts?: any) => { const where = opts?.where ? translateSearch(opts.where, ["name", "email"]) : undefined; return rawPrisma.contact.findMany({ ...opts, where }); },
    findUnique: (o: any) => rawPrisma.contact.findUnique(o),
    create: (o: any) => rawPrisma.contact.create(o),
    update: (o: any) => rawPrisma.contact.update(o),
    delete: (o: any) => rawPrisma.contact.delete(o),
  },
  lead: {
    findMany: (opts?: any) => { const where = opts?.where ? translateStatusIn(opts.where) : undefined; return rawPrisma.lead.findMany({ ...opts, where }); },
    findUnique: (o: any) => rawPrisma.lead.findUnique(o),
    create: (o: any) => rawPrisma.lead.create(o),
    update: (o: any) => rawPrisma.lead.update(o),
    delete: (o: any) => rawPrisma.lead.delete(o),
    count: (o?: any) => rawPrisma.lead.count(o),
  },
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
  task: {
    findMany: (o?: any) => rawPrisma.task.findMany(o),
    findUnique: (o: any) => rawPrisma.task.findUnique(o),
    create: (o: any) => rawPrisma.task.create(o),
    update: async (opts: any) => {
      if (opts.data.status === "completed" && !opts.data.completedAt) opts.data.completedAt = new Date().toISOString();
      else if (opts.data.status && opts.data.status !== "completed") opts.data.completedAt = null;
      return rawPrisma.task.update(opts);
    },
    delete: (o: any) => rawPrisma.task.delete(o),
  },
  project: {
    findMany: (o?: any) => rawPrisma.project.findMany(o),
    findUnique: (o: any) => rawPrisma.project.findUnique(o),
    create: (o: any) => rawPrisma.project.create(o),
    update: (o: any) => rawPrisma.project.update(o),
    delete: async (opts: any) => {
      const pid = opts.where.id;
      await rawPrisma.projectTask.deleteMany({ where: { projectId: pid } });
      await rawPrisma.projectWorker.deleteMany({ where: { projectId: pid } });
      return rawPrisma.project.delete(opts);
    },
  },
  projectTask: {
    findMany: (o?: any) => rawPrisma.projectTask.findMany(o),
    createMany: (o: any) => rawPrisma.projectTask.createMany(o),
    update: (o: any) => rawPrisma.projectTask.update(o),
    delete: (o: any) => rawPrisma.projectTask.delete(o),
    deleteMany: (o: any) => rawPrisma.projectTask.deleteMany(o),
  },
  projectDocument: {
    findMany: (o?: any) => rawPrisma.document.findMany(o),
    findUnique: (o: any) => rawPrisma.document.findUnique(o),
    create: (o: any) => rawPrisma.document.create(o),
    update: (o: any) => rawPrisma.document.update(o),
    delete: (o: any) => rawPrisma.document.delete(o),
    deleteMany: (o: any) => rawPrisma.document.deleteMany(o),
    count: (o?: any) => rawPrisma.document.count(o),
  },
  knowledgeBaseArticle: {
    findMany: (o?: any) => rawPrisma.knowledgeBase.findMany(o),
    findUnique: (o: any) => rawPrisma.knowledgeBase.findUnique(o),
    create: (o: any) => rawPrisma.knowledgeBase.create(o),
    update: (o: any) => rawPrisma.knowledgeBase.update(o),
    delete: (o: any) => rawPrisma.knowledgeBase.delete(o),
    count: (o?: any) => rawPrisma.knowledgeBase.count(o),
  },
};

export async function getIntegrationAuth(provider: string) {
  const record = await rawPrisma.integrationAuth.findUnique({ where: { provider } });
  return record ? (record.data as any) : null;
}

export async function setIntegrationAuth(provider: string, data: any) {
  return rawPrisma.integrationAuth.upsert({ where: { provider }, update: { data }, create: { provider, data } });
}

export async function deleteIntegrationAuth(provider: string) {
  try { await rawPrisma.integrationAuth.delete({ where: { provider } }); } catch {}
}

export const prisma: any = new Proxy(rawPrisma, {
  get(target: any, prop: string | symbol) {
    if (typeof prop === "string" && wrappers[prop]) return wrappers[prop];
    return target[prop];
  },
});

export default prisma;
