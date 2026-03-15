import { prisma } from "@/lib/prisma";
import { Users, Plus } from "lucide-react";
import Link from "next/link";
import ContactsTable from "./ContactsTable";
import { getTranslation, type Language } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    include: {
      company: true,
    },
  });

  const language: Language = "en";
  const t = (key: string) => getTranslation(language, key);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={28} className="text-[#7BC143]" />
            {t("contacts.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{contacts.length} {t("contacts.inSystem")}</p>
        </div>
        <Link
          href="/contacts/new"
          className="px-4 py-2 bg-[#7BC143] hover:bg-[#6aad38] text-white text-sm rounded-full font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          {t("contacts.newContact")}
        </Link>
      </div>

      <ContactsTable contacts={contacts} />
    </div>
  );
}
