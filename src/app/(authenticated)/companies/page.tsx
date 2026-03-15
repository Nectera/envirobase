import { prisma } from "@/lib/prisma";
import { Building2 } from "lucide-react";
import CompaniesTable from "./CompaniesTable";
import AddCompanyModal from "./AddCompanyModal";
import { getTranslation, type Language } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    include: {
      contacts: true,
      leads: true,
    },
  });

  const language: Language = "en";
  const t = (key: string) => getTranslation(language, key);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={28} className="text-[#7BC143]" />
            {t("companies.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{companies.length} {t("companies.inSystem")}</p>
        </div>
        <AddCompanyModal />
      </div>

      <CompaniesTable companies={companies} />
    </div>
  );
}
