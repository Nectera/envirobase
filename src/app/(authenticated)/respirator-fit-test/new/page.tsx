import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RespiratorFitTestForm from "../RespiratorFitTestForm";

export default async function NewRespiratorFitTestPage({
  searchParams
}: {
  searchParams: { workerId?: string; projectId?: string }
}) {
  const workerId = searchParams.workerId;
  const projectId = searchParams.projectId;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/respirator-fit-test"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft size={14} /> All Fit Tests
        </Link>
      </div>

      <h1 className="text-xl font-bold text-slate-900 mb-1">New Respirator Fit Test</h1>
      <p className="text-sm text-slate-500 mb-6">
        OSHA 29 CFR 1910.134 - Quantitative/Qualitative Fit Testing
      </p>

      <RespiratorFitTestForm presetWorkerId={workerId} presetProjectId={projectId} />
    </div>
  );
}
