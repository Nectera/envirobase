import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, FileDown, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

function Field({ label, value, fullWidth }: { label: string; value: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value || <span className="text-slate-400">N/A</span>}</dd>
    </div>
  );
}

function BoolField({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {value ? <XCircle size={16} className="text-red-500" /> : <CheckCircle size={16} className="text-green-500" />}
      <span className="text-sm text-slate-700">{label}: <span className="font-medium">{value ? "Yes" : "No"}</span></span>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default async function FieldReportDetailPage({ params }: { params: { id: string } }) {
  const raw = await prisma.dailyFieldReport.findUnique({
    where: { id: params.id },
    include: { project: true },
  });

  if (!raw) return notFound();

  // Flatten data JSON onto the report so fields like supervisorName, incident, etc. are accessible
  const report: any = {
    ...raw,
    ...(raw.data && typeof raw.data === "object" ? raw.data : {}),
  };

  const hasSafetyEvent = report.incident || report.stopWork;

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    reviewed: "bg-green-100 text-green-800",
  };

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {report.projectId && (
              <Link href={`/projects/${report.projectId}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                <ArrowLeft size={14} /> Back to Project
              </Link>
            )}
            <Link href="/field-reports" className="text-sm text-slate-400 hover:text-slate-600">
              All Reports
            </Link>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Daily Field Report — {new Date(report.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {report.project?.name || "Unknown Project"} • {report.supervisorName || "No supervisor"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[report.status] || "bg-slate-100"}`}>
            {report.status}
          </span>
          <a
            href={`/api/field-reports/${report.id}/pdf`}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg"
          >
            <FileDown size={14} /> Export PDF
          </a>
        </div>
      </div>

      {hasSafetyEvent && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertTriangle size={18} />
          <div>
            <span className="font-semibold">Safety Event Reported:</span>
            {report.incident && " Incident"}
            {report.stopWork && " Stop Work"}
          </div>
        </div>
      )}

      {/* Job Info */}
      <SectionBlock title="Job Information">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <Field label="Job / Project" value={report.project?.name} />
          <Field label="Date" value={new Date(report.date).toLocaleDateString()} />
          <Field label="Supervisor" value={report.supervisorName} />
          <Field label="Project Manager" value={report.projectManagerName} />
          <Field label="Address" value={report.project?.address} />
          <Field label="Client" value={report.project?.client} />
        </dl>
      </SectionBlock>

      {/* Weather */}
      {report.weatherCurrentTemp && (
        <SectionBlock title="Weather Conditions">
          <dl className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-3">
            <Field label="Temperature" value={report.weatherCurrentTemp} />
            <Field label="Wind" value={report.weatherCurrentWind} />
            <Field label="Conditions" value={report.weatherCurrentCondition} />
            <Field label="Humidity" value={report.weatherCurrentHumidity} />
            <Field label="Heat Index" value={report.weatherCurrentHeatIndex} />
          </dl>
        </SectionBlock>
      )}

      {/* Scope */}
      <SectionBlock title="Scope of Work">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <Field label="Scope Received" value={report.scopeReceived ? "Yes" : "No"} />
          <Field label="Scope Date" value={report.scopeDate ? new Date(report.scopeDate).toLocaleDateString() : null} />
          <Field label="Detailed Description" value={
            <p className="whitespace-pre-wrap text-slate-700">{report.scopeDescription}</p>
          } fullWidth />
          <Field label="Work Area Locations" value={
            report.workAreaLocations?.length > 0
              ? <div className="flex gap-2 flex-wrap">{report.workAreaLocations.map((loc: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">{loc}</span>
                ))}</div>
              : null
          } fullWidth />
        </dl>
      </SectionBlock>

      {/* Timeline */}
      <SectionBlock title="Project Timeline">
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
          <Field label="Estimated Completion" value={report.estimatedCompletionDate ? new Date(report.estimatedCompletionDate).toLocaleDateString() : null} />
          <Field label="Days Remaining" value={report.daysRemaining != null ? `${report.daysRemaining} days` : null} />
          <Field label="Estimated Total Hours" value={report.estimatedHoursTotal != null ? `${report.estimatedHoursTotal} hrs` : null} />
        </dl>
      </SectionBlock>

      {/* Work */}
      <SectionBlock title="Work Completed Today">
        <dl className="space-y-3">
          <Field label="Work Completed" value={
            <p className="whitespace-pre-wrap text-slate-700">
              {[report.workCompletedToday, report.workflow].filter(Boolean).join("\n\n")}
            </p>
          } fullWidth />
        </dl>
      </SectionBlock>

      {/* End of Shift */}
      <SectionBlock title="End of Shift Review">
        <Field label="Shift Review" value={
          <p className="whitespace-pre-wrap text-slate-700">{report.shiftReview}</p>
        } fullWidth />
        <div className="flex gap-6 pt-3 mt-3 border-t border-slate-100">
          <BoolField label="Incident" value={report.incident} />
          <BoolField label="Stop Work" value={report.stopWork} />
        </div>
        {report.incidentDetails && <p className="mt-2 text-sm text-red-700 bg-red-50 p-2 rounded">Incident: {report.incidentDetails}</p>}
        {report.stopWorkDetails && <p className="mt-2 text-sm text-red-700 bg-red-50 p-2 rounded">Stop Work: {report.stopWorkDetails}</p>}
      </SectionBlock>

      {/* Goals */}
      <SectionBlock title="Goals">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <Field label="Goals for Tomorrow" value={report.goalsForTomorrow} />
          <Field label="Goals for the Week" value={report.goalsForWeek} />
        </dl>
      </SectionBlock>

      {/* Notes */}
      <SectionBlock title="Notes, Meetings & Visitors">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <Field label="Project Notes" value={report.projectNotes} fullWidth />
          <Field label="Meeting Log" value={report.meetingLog} />
          <Field label="Visitors" value={report.visitors} />
        </dl>
      </SectionBlock>

      {/* Equipment & Monitoring */}
      <SectionBlock title="Equipment & Monitoring">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <Field label="Negative Air Machines" value={report.negativeAirMachineCount != null ? String(report.negativeAirMachineCount) : null} />
          <Field label="Negative Air Established" value={report.negativeAirEstablished ? "Yes" : "No"} />
          <Field label="Equipment Malfunctions" value={report.equipmentMalfunctions} fullWidth />
          {report.manometerPhoto && report.manometerPhoto.startsWith("data:") ? (
            <div className="col-span-2">
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Manometer Photo</dt>
              <dd className="mt-1">
                <img src={report.manometerPhoto} alt="Manometer readout" className="max-h-64 rounded-lg border border-slate-200" />
              </dd>
            </div>
          ) : (
            <Field label="Manometer Photo" value={report.manometerPhoto} />
          )}
        </dl>
      </SectionBlock>

      {/* Asbestos */}
      <SectionBlock title="Asbestos Identified in Work Area">
        <Field label="ACM in Work Area" value={
          report.asbestosInWorkArea
            ? <p className="whitespace-pre-wrap text-slate-700">{report.asbestosInWorkArea}</p>
            : null
        } fullWidth />
      </SectionBlock>

      {/* Photos */}
      {report.photos?.length > 0 && (
        <SectionBlock title={`Daily Pictures (${report.photos.length})`}>
          {report.photos.length < 6 && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <AlertTriangle size={14} />
              <span>Below the 6-photo minimum requirement.</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {report.photos.map((photo: any, i: number) => (
              <div key={i} className="bg-slate-100 rounded-lg overflow-hidden">
                {(photo.url || photo.dataUrl) ? (
                  <img src={photo.url || photo.dataUrl} alt={photo.caption || `Photo ${i + 1}`} className="w-full h-48 object-cover" />
                ) : (
                  <div className="h-24 flex items-center justify-center text-slate-400">
                    <span className="text-sm">{photo.filename || "No image"}</span>
                  </div>
                )}
                <div className="p-2 text-center">
                  <div className="text-xs text-slate-400">#{i + 1}</div>
                  {photo.filename && <div className="text-xs font-medium text-slate-700 truncate">{photo.filename}</div>}
                  {photo.caption && <div className="text-xs text-slate-500 mt-0.5">{photo.caption}</div>}
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {/* Meta */}
      <div className="text-xs text-slate-400 pt-2 pb-8">
        Created: {new Date(report.createdAt).toLocaleString()} • Last updated: {new Date(report.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
