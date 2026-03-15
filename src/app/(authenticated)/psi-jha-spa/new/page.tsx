"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PsiJhaSpaForm from "../PsiJhaSpaForm";

export default function NewPsiJhaSpaPage() {
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
          <Link href="/psi-jha-spa" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition">
            <ArrowLeft size={14} /> All PSI / JHA / SPA
          </Link>
        )}
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">New PSI / JHA / SPA</h1>
      <p className="text-sm text-slate-500 mb-6">Pre-Shift Inspection · Job Hazard Analysis · Safe Plan of Action</p>
      <PsiJhaSpaForm presetProjectId={projectId} />
    </div>
  );
}
