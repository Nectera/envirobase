import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ContactDetail from "./ContactDetail";

export const dynamic = "force-dynamic";

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { company: true },
  });

  if (!contact) {
    notFound();
  }

  // Fetch activities for this contact
  const rawActivities = await prisma.activity.findMany({
    where: { parentType: "contact", parentId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const activities = rawActivities.map((a: any) => ({ ...a, description: a.content || a.description || "" }));

  // Fetch linked activities from their company
  let companyActivities: any[] = [];
  if (contact.companyId) {
    const rawCompanyActivities = await prisma.activity.findMany({
      where: { parentType: "company", parentId: contact.companyId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    companyActivities = rawCompanyActivities.map((a: any) => ({ ...a, description: a.content || a.description || "" }));
  }

  // Fetch leads related to this contact
  const relatedLeads = await prisma.lead.findMany({
    where: { contactId: id },
    take: 10,
  });

  return (
    <ContactDetail
      contact={contact}
      activities={activities}
      companyActivities={companyActivities}
      relatedLeads={relatedLeads}
    />
  );
}
