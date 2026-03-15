import { Suspense } from "react";
import CertificateForm from "../CertificateForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NewCertificatePage({
  searchParams,
}: {
  searchParams: { projectId?: string };
}) {
  const projectId = searchParams.projectId;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/certificate-of-completion" className="text-slate-500 hover:text-slate-700">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">New Certificate of Completion</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create a new certificate for project completion</p>
        </div>
      </div>

      <Suspense fallback={<div className="text-slate-500">Loading form...</div>}>
        <CertificateForm initialProjectId={projectId} />
      </Suspense>
    </div>
  );
}
