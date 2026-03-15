import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { formatDate, daysUntil, getStatusColor, getTypeBadgeColor } from "@/lib/utils";
import { TYPE_LABELS } from "@/lib/regulations";
import Link from "next/link";
import { ArrowLeft, Plus, Stethoscope, AlertTriangle, ChevronRight, MapPin } from "lucide-react";
import CreateAccountButton from "./CreateAccountButton";
import SkillRating from "./SkillRating";
import CertificationsSection from "./CertificationsSection";

export const dynamic = "force-dynamic";

export default async function WorkerDetailPage({ params }: { params: { id: string } }) {
  const worker = await prisma.worker.findUnique({
    where: { id: params.id },
    include: {
      certifications: { orderBy: { expires: "asc" } },
      medicalRecords: { orderBy: { examDate: "desc" } },
      projectWorkers: { include: { project: true } },
    },
  });

  if (!worker) notFound();

  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role as string | undefined;
  const fieldPositions = ["Technician", "Supervisor", "Laborer"];
  const showSkillRating = isAdmin(userRole) && fieldPositions.includes(worker.position || "");

  // Fetch fit tests for this worker
  const fitTests = await prisma.respiratorFitTest.findMany({
    where: { workerId: worker.id },
  });

  const types = worker.types.split(",").filter(Boolean);
  const latestMed = worker.medicalRecords[0];

  // Determine fit test status
  const today = new Date().toISOString().split("T")[0];
  const latestFitTest = fitTests[0]; // already sorted desc by testDate
  const fitTestCurrent = latestFitTest && latestFitTest.status === "completed" && latestFitTest.expiresDate > today;
  const fitTestExpired = latestFitTest && latestFitTest.status === "completed" && latestFitTest.expiresDate <= today;

  return (
    <div>
      <Link href="/workers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-4 transition">
        <ArrowLeft size={14} /> Back to Team
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
            {worker.photoUrl ? (
              <img src={worker.photoUrl} alt={worker.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-slate-500">
                {worker.name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{worker.name}</h1>
            <p className="text-sm text-slate-500">{worker.position || worker.role}</p>
            {(worker.address || worker.homeCity) && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <MapPin size={12} />
                {[worker.address, worker.homeCity, worker.homeState, worker.homeZip].filter(Boolean).join(", ")}
              </p>
            )}
            <div className="flex gap-1 mt-2">
              {types.map((t: any) => (
                <span key={t} className={`text-[11px] font-medium px-2 py-0.5 rounded ${getTypeBadgeColor(t)}`}>
                  {TYPE_LABELS[t.toUpperCase()] || t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <CreateAccountButton
          workerId={worker.id}
          workerName={worker.name}
          workerEmail={worker.email}
          hasAccount={!!worker.userId}
        />
      </div>

      {/* Skill Rating - Admin Only */}
      {showSkillRating && (
        <SkillRating workerId={worker.id} currentRating={(worker as any).skillRating || null} />
      )}

      {/* Certifications */}
      <CertificationsSection
        workerId={worker.id}
        initialCerts={worker.certifications.map((c: any) => ({
          id: c.id,
          name: c.name,
          number: c.number,
          issued: c.issued,
          expires: c.expires,
          status: c.status,
          fileUrl: c.fileUrl || null,
          fileName: c.fileName || null,
        }))}
      />

      {/* Respirator Fit Tests */}
      <div className="bg-white rounded-lg border border-slate-200 mb-6">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope size={16} className="text-slate-500" />
            <h3 className="text-sm font-semibold">Respirator Fit Tests</h3>
            {fitTestCurrent && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-green-100 text-green-700">Current</span>
            )}
            {fitTestExpired && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
                <AlertTriangle size={10} /> Expired
              </span>
            )}
            {!latestFitTest && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">No tests on file</span>
            )}
          </div>
          <Link
            href={`/respirator-fit-test/new?workerId=${worker.id}`}
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus size={12} /> New Fit Test
          </Link>
        </div>
        {fitTests.length > 0 ? (
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Test Date</th>
                  <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Respirator</th>
                  <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Size</th>
                  <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Expires</th>
                  <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {fitTests.map((ft: any) => {
                  const expired = ft.status === "completed" && ft.expiresDate <= today;
                  const results = ft.testResults || {};
                  const hasFail = Object.values(results).includes("fail");
                  let statusLabel = ft.status;
                  let statusColor = "bg-slate-100 text-slate-600";
                  if (ft.status === "completed") {
                    if (expired) {
                      statusLabel = "expired";
                      statusColor = "bg-red-100 text-red-700";
                    } else if (hasFail) {
                      statusLabel = "failed";
                      statusColor = "bg-red-100 text-red-700";
                    } else {
                      statusLabel = "passed";
                      statusColor = "bg-green-100 text-green-700";
                    }
                  } else {
                    statusColor = "bg-yellow-100 text-yellow-700";
                  }
                  return (
                    <tr key={ft.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-[13px]">
                        {ft.testDate ? new Date(ft.testDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{ft.respiratorType || "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{ft.respiratorSize || "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {ft.expiresDate ? new Date(ft.expiresDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        {expired && <span className="ml-1 text-red-500 text-[10px]">(overdue)</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded capitalize ${statusColor}`}>{statusLabel}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/respirator-fit-test/${ft.id}`} className="text-slate-400 hover:text-indigo-600">
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 text-center">
            <Stethoscope size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">No respirator fit tests on file</p>
            <p className="text-xs text-slate-400 mt-1">OSHA requires annual fit testing per 29 CFR 1910.134</p>
            <Link
              href={`/respirator-fit-test/new?workerId=${worker.id}`}
              className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Plus size={12} /> Schedule Fit Test
            </Link>
          </div>
        )}
      </div>

      {/* Medical Surveillance */}
      <div className="bg-white rounded-lg border border-slate-200 mb-6">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold">Medical Surveillance</h3>
        </div>
        <div className="p-5">
          {latestMed ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-[11px] text-slate-400 mb-1">Last Medical Exam</div>
                <div className="text-sm font-medium">{formatDate(latestMed.examDate)}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-[11px] text-slate-400 mb-1">Next Medical Exam</div>
                <div className="text-sm font-medium">{formatDate(latestMed.nextExamDate)}</div>
                {(() => {
                  const d = daysUntil(latestMed.nextExamDate);
                  return d !== null && d < 60 ? (
                    <div className="text-[11px] text-amber-600">Due in {d} days</div>
                  ) : null;
                })()}
              </div>
              {latestMed.respiratorFitDate && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-[11px] text-slate-400 mb-1">Respirator Fit Test (Medical)</div>
                  <div className="text-sm font-medium">{formatDate(latestMed.respiratorFitDate)}</div>
                </div>
              )}
              {latestMed.bll && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-[11px] text-slate-400 mb-1">Blood Lead Level</div>
                  <div className="text-sm font-medium">{latestMed.bll}</div>
                  <div className="text-[11px] text-slate-400">Action: 30 µg/m³ &bull; Removal: &gt;50 µg/dL</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No medical records on file</p>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
            <strong>OSHA Record Retention:</strong> Medical surveillance records must be retained for duration of employment plus 30 years (29 CFR 1926.1101 / 1926.62). Exposure monitoring records: 30 years.
          </div>
        </div>
      </div>

      {/* Assigned Projects */}
      {worker.projectWorkers.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold">Assigned Projects</h3>
          </div>
          <div className="p-4 space-y-2">
            {worker.projectWorkers.map((pw: any) => (
              <Link
                key={pw.id}
                href={`/projects/${pw.project.id}`}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
              >
                <div>
                  <div className="text-sm font-medium">{pw.project.name}</div>
                  <div className="text-xs text-slate-400">{pw.project.projectNumber}</div>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${getTypeBadgeColor(pw.project.type)}`}>
                  {TYPE_LABELS[pw.project.type]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
