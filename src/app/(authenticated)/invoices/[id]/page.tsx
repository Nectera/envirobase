import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import InvoiceDetail from "./InvoiceDetail";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { consultationEstimate: true, company: true, contact: true, lead: true },
  });

  if (!invoice) notFound();

  return <InvoiceDetail data={invoice} />;
}
