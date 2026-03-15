import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

// Use the same singleton + pgbouncer-configured PrismaClient from prisma.ts
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

/**
 * GET /api/search?q=query
 * Global search across projects, leads, contacts, companies, tasks, and chat messages.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Run all searches in parallel using rawPrisma to bypass proxy limitations
    const [projects, leads, contacts, companies, tasks, messages] = await Promise.all([
      // Projects — search name, address, client
      rawPrisma.project.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
            { client: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, status: true, type: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // Leads — search firstName, lastName, email, phone, address
      rawPrisma.lead.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          company: { select: { name: true } },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // Contacts — search firstName, lastName, name, email, phone
      rawPrisma.contact.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, name: true, email: true, title: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // Companies — search name, city
      rawPrisma.company.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, type: true, city: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // Tasks — search title
      rawPrisma.task.findMany({
        where: {
          title: { contains: q, mode: "insensitive" },
        },
        select: { id: true, title: true, status: true, priority: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // Chat messages — search content
      rawPrisma.chatMessage.findMany({
        where: {
          content: { contains: q, mode: "insensitive" },
        },
        select: {
          id: true,
          content: true,
          senderName: true,
          channelId: true,
          createdAt: true,
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const results = [
      ...projects.map((p: any) => ({
        type: "project" as const,
        id: p.id,
        title: p.name,
        subtitle: p.type,
        status: p.status,
        href: `/projects/${p.id}`,
      })),
      ...leads.map((l: any) => ({
        type: "lead" as const,
        id: l.id,
        title: [l.firstName, l.lastName].filter(Boolean).join(" ") || "Unknown",
        subtitle: (l as any).company?.name || "",
        status: l.status,
        href: `/leads/${l.id}`,
      })),
      ...contacts.map((c: any) => ({
        type: "contact" as const,
        id: c.id,
        title: c.name || [c.firstName, c.lastName].filter(Boolean).join(" "),
        subtitle: c.email || c.title || "",
        href: `/contacts/${c.id}`,
      })),
      ...companies.map((c: any) => ({
        type: "company" as const,
        id: c.id,
        title: c.name,
        subtitle: c.city || c.type || "",
        href: `/companies/${c.id}`,
      })),
      ...tasks.map((t: any) => ({
        type: "task" as const,
        id: t.id,
        title: t.title,
        subtitle: t.priority,
        status: t.status,
        href: `/tasks`,
      })),
      ...messages.map((m: any) => ({
        type: "message" as const,
        id: m.id,
        title: m.content.length > 80 ? m.content.slice(0, 80) + "…" : m.content,
        subtitle: m.senderName,
        href: `/chat?channel=${m.channelId}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
