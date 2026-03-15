"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PreAbatementForm from "../PreAbatementForm";

export default function NewPreAbatementPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        {projectId ? (
          <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition">
            <ArrowLeft size={14} /> Back to Project
          </Link>
        ) : (
          <Link href="/pre-abatement-inspection" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition">
            <ArrowLeft size={14} /> All Pre-Abatement Inspections
          </Link>
        )}
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">New Pre-Abatement Inspection</h1>
      <p className="text-sm text-slate-500 mb-6">Visual Inspection Checklist</p>
      <PreAbatementForm presetProjectId={projectId} />
    </div>
  );
}
