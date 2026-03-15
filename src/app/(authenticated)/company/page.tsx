import { prisma } from "@/lib/prisma";
import CompanyPage from "./CompanyPage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const record = await prisma.companyInfo.findFirst();
  const licenses = await prisma.companyLicense.findMany();

  // Unwrap the data JSON field into flat company info object
  const info = record
    ? { id: record.id, ...(record.data as Record<string, any> || {}) } as any
    : null;

  return <CompanyPage initialInfo={info} initialLicenses={licenses} />;
}
