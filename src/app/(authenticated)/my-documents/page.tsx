import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWorkerForUser } from "@/lib/roles";
import MyDocumentsView from "./MyDocumentsView";
import { getTranslation, type Language } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function MyDocumentsPage() {
  const language: Language = "en";
  const t = (key: string) => getTranslation(language, key);

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return (
      <div>
        <h1 className="text-xl font-bold text-slate-900 mb-6">{t("myDocuments.title")}</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-sm text-amber-800">{t("myDocuments.unableToLoad")}</p>
        </div>
      </div>
    );
  }

  const worker = await getWorkerForUser(userId);

  if (!worker) {
    return (
      <div>
        <h1 className="text-xl font-bold text-slate-900 mb-6">{t("myDocuments.title")}</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-sm text-amber-800">{t("myDocuments.noProfile")}</p>
        </div>
      </div>
    );
  }

  // Get worker with certifications and medical records
  const workerFull = await prisma.worker.findUnique({
    where: { id: worker.id },
    include: {
      certifications: { orderBy: { expires: "asc" } },
      medicalRecords: { orderBy: { examDate: "desc" } },
    },
  });

  // Get respirator fit tests
  const fitTests = await prisma.respiratorFitTest.findMany({
    where: { workerId: worker.id },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{t("myDocuments.title")}</h1>
        <p className="text-sm text-slate-500">{worker.name} — {t("myDocuments.subtitle")}</p>
      </div>
      <MyDocumentsView
        certifications={workerFull?.certifications || []}
        medicalRecords={workerFull?.medicalRecords || []}
        fitTests={fitTests}
      />
    </div>
  );
}
