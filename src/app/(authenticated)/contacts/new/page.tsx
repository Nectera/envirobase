import { prisma } from "@/lib/prisma";
import NewContactForm from "./NewContactForm";

export const dynamic = "force-dynamic";

export default async function NewContactPage() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <NewContactForm companies={companies} />;
}
