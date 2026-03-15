import { prisma } from "@/lib/prisma";
import DataManagementView from "./DataManagementView";

export const dynamic = "force-dynamic";

export default async function DataManagementPage() {
  const [companies, contacts, leads, estimates, invoices, activities, knowledgeBase] = await Promise.all([
    prisma.company.findMany(),
    prisma.contact.findMany(),
    prisma.lead.findMany(),
    prisma.estimate.findMany(),
    prisma.invoice.findMany(),
    prisma.activity.findMany(),
    prisma.knowledgeBaseArticle.findMany(),
  ]);

  const counts = {
    companies: companies.length,
    contacts: contacts.length,
    leads: leads.length,
    estimates: estimates.length,
    invoices: invoices.length,
    activities: activities.length,
  };
  const knowledgeBaseArticles = knowledgeBase.sort(
    (a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || "")
  );
  return <DataManagementView counts={counts} initialArticles={knowledgeBaseArticles} />;
}
