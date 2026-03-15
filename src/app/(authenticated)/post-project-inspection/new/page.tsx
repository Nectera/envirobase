"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PostProjectForm from "../PostProjectForm";
import { useEffect, useState } from "react";

export default function NewPostProjectPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;
  const [projects, setProjects] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data);
        if (projectId) {
          const selectedProject = data.find((p: any) => p.id === projectId);
          setProject(selectedProject || null);
        }
        setLoading(false);
      })
      .catch(() => {
        setProjects([]);
        setLoading(false);
      });
  }, [projectId]);

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <Link href="/post-project-inspection" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition">
            <ArrowLeft size={14} /> All Post-Project Inspections
          </Link>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">New Post-Project Inspection</h1>
        <p className="text-sm text-slate-500 mb-6">Project Completion Checklist</p>
        <div className="text-center py-12">
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        {projectId ? (
          <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition">
            <ArrowLeft size={14} /> Back to Project
          </Link>
        ) : (
          <Link href="/post-project-inspection" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition">
            <ArrowLeft size={14} /> All Post-Project Inspections
          </Link>
        )}
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">New Post-Project Inspection</h1>
      <p className="text-sm text-slate-500 mb-6">Project Completion Checklist</p>
      <PostProjectForm projects={projects} project={project} />
    </div>
  );
}
