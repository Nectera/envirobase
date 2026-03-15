import { prisma } from "@/lib/prisma";
import CertificateForm from "../CertificateForm";
import Link from "next/link";
import { ChevronLeft, Download, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CertificateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const cert = await prisma.certificateOfCompletion.findUnique({
    where: { id: params.id },
    include: { project: true },
  });

  if (!cert) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/certificate-of-completion" className="text-slate-500 hover:text-slate-700">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Certificate of Completion
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {cert.project?.name || "Unknown Project"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/certificate-of-completion/${cert.id}/pdf`}
            download
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Download size={16} /> Download PDF
          </a>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Work Site Address</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{cert.workSiteAddress || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Job Number</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{cert.jobNumber || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Demobilization Date</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {cert.demobilizationDate
                ? new Date(cert.demobilizationDate + "T12:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Status</p>
            <p className="text-sm font-semibold text-slate-900 mt-1 capitalize">{cert.status}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <CertificateForm
        initialProjectId={cert.projectId}
        certificateId={cert.id}
        initialData={cert}
      />

      {/* Delete Button */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <DeleteButton certificateId={cert.id} />
      </div>
    </div>
  );
}

function DeleteButton({ certificateId }: { certificateId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await prisma.certificateOfCompletion.delete({ where: { id: certificateId } });
        // Note: In a real app, you'd want to redirect after delete
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
      >
        <Trash2 size={16} /> Delete Certificate
      </button>
    </form>
  );
}
