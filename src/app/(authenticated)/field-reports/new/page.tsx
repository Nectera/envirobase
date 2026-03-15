"use client";

import { useSearchParams } from "next/navigation";
import FieldReportForm from "../FieldReportForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewFieldReportPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;

  return (
    <div>
      {projectId && (
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-3 transition">
          <ArrowLeft size={14} /> Back to Project
        </Link>
      )}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">New Daily Field Report</h1>
        <p className="text-sm text-slate-500 mt-0.5">Fill out the report for today&apos;s field work.</p>
      </div>
      <FieldReportForm presetProjectId={projectId} />
    </div>
  );
}
