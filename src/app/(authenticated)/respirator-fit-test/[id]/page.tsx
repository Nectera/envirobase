import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Download, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { FIT_TEST_ITEMS } from "@/lib/respirator-fit-tests";

export const dynamic = "force-dynamic";

export default async function RespiratorFitTestDetailPage({
  params
}: {
  params: { id: string }
}) {
  const item = await prisma.respiratorFitTest.findUnique({
    where: { id: params.id },
    include: { worker: true, project: true }
  });

  if (!item) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Not found</h2>
        <p className="text-slate-500 mb-4">This fit test record does not exist.</p>
        <Link href="/respirator-fit-test" className="text-indigo-600 hover:text-indigo-700">
          Return to list
        </Link>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function getDisplayStatus(): "passed" | "failed" | "expired" | "pending" | "draft" {
    if (item.status !== "completed") {
      return "draft";
    }

    const expiresDate = new Date(item.expiresDate);
    expiresDate.setHours(0, 0, 0, 0);

    if (expiresDate < today) {
      return "expired";
    }

    const results = Object.values(item.testResults || {});
    if (results.length === 0) {
      return "pending";
    }

    const hasFail = results.includes("fail");
    return hasFail ? "failed" : "passed";
  }

  const displayStatus = getDisplayStatus();
  const statusConfig: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    passed: {
      bg: "bg-green-50",
      text: "text-green-800",
      border: "border-green-200",
      icon: CheckCircle
    },
    failed: {
      bg: "bg-red-50",
      text: "text-red-800",
      border: "border-red-200",
      icon: AlertCircle
    },
    expired: {
      bg: "bg-orange-50",
      text: "text-orange-800",
      border: "border-orange-200",
      icon: AlertCircle
    },
    pending: {
      bg: "bg-yellow-50",
      text: "text-yellow-800",
      border: "border-yellow-200",
      icon: Clock
    },
    draft: {
      bg: "bg-slate-50",
      text: "text-slate-800",
      border: "border-slate-200",
      icon: Clock
    }
  };

  const config = statusConfig[displayStatus];
  const IconComponent = config.icon;

  const testDate = new Date(item.testDate + "T12:00:00");
  const expiresDate = new Date(item.expiresDate + "T12:00:00");
  const performedDate = item.performedByDate
    ? new Date(item.performedByDate + "T12:00:00")
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/respirator-fit-test"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft size={14} /> All Fit Tests
        </Link>

        <a
          href={`/api/respirator-fit-test/${item.id}/pdf`}
          download
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Download size={16} /> Download PDF
        </a>
      </div>

      {/* Header with Status */}
      <div className={`rounded-lg border ${config.border} ${config.bg} p-5 mb-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {item.employeeName || item.worker?.name || "Respirator Fit Test"}
            </h1>
            <p className={`text-sm ${config.text} flex items-center gap-2`}>
              <IconComponent size={14} />
              Status: <span className="font-semibold capitalize">{displayStatus}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Project Information */}
      {(item.branchLocation ||
        item.jobAddress ||
        item.projectName ||
        item.projectSupervisor ||
        item.projectManager ||
        item.projectNumber) && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Project Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {item.branchLocation && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Branch Location</p>
                <p className="text-sm text-slate-900 font-medium">{item.branchLocation}</p>
              </div>
            )}
            {item.jobAddress && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Job Address</p>
                <p className="text-sm text-slate-900 font-medium">{item.jobAddress}</p>
              </div>
            )}
            {item.projectName && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Project Name</p>
                <p className="text-sm text-slate-900 font-medium">{item.projectName}</p>
              </div>
            )}
            {item.projectNumber && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Project Number</p>
                <p className="text-sm text-slate-900 font-medium">{item.projectNumber}</p>
              </div>
            )}
            {item.projectSupervisor && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Project Supervisor</p>
                <p className="text-sm text-slate-900 font-medium">{item.projectSupervisor}</p>
              </div>
            )}
            {item.projectManager && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Project Manager</p>
                <p className="text-sm text-slate-900 font-medium">{item.projectManager}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* General & Employee Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">General Information</h2>

          <div className="space-y-3">
            {item.supervisor && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Supervisor</p>
                <p className="text-sm text-slate-900 font-medium">{item.supervisor}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Test Date</p>
              <p className="text-sm text-slate-900 font-medium">
                {testDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Employee Information</h2>

          <div className="space-y-3">
            {item.respiratorType && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Type of Respirator</p>
                <p className="text-sm text-slate-900 font-medium">{item.respiratorType}</p>
              </div>
            )}
            {item.respiratorSize && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Size</p>
                <p className="text-sm text-slate-900 font-medium">{item.respiratorSize}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Expires</p>
              <p className="text-sm text-slate-900 font-medium">
                {expiresDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fit Test Results */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Fit Test Results</h2>

        <div className="space-y-2">
          {FIT_TEST_ITEMS.map((testItem) => {
            const result = (item.testResults || {})[testItem.key] || "—";
            let resultColor = "text-slate-500";
            let resultSymbol = "—";

            if (result === "pass") {
              resultColor = "text-green-700 font-semibold";
              resultSymbol = "✓ Pass";
            } else if (result === "fail") {
              resultColor = "text-red-700 font-semibold";
              resultSymbol = "✗ Fail";
            } else if (result === "na") {
              resultColor = "text-slate-500";
              resultSymbol = "N/A";
            }

            return (
              <div key={testItem.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-700 font-medium">{testItem.label}</span>
                <span className={`text-sm ${resultColor}`}>{resultSymbol}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comments */}
      {item.comments && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Comments</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.comments}</p>
        </div>
      )}

      {/* Inspection & Attestation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Inspection Performed By</h2>

          <div className="space-y-3">
            {item.performedByName && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Name</p>
                <p className="text-sm text-slate-900 font-medium">{item.performedByName}</p>
              </div>
            )}
            {performedDate && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Date</p>
                <p className="text-sm text-slate-900 font-medium">
                  {performedDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Employee Attestation</h2>

          {item.employeeSignDate ? (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Signature Date</p>
              <p className="text-sm text-slate-900 font-medium">
                {new Date(item.employeeSignDate + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">Not yet signed</p>
          )}
        </div>
      </div>

      {/* Compliance Note */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-6">
        <p className="text-xs text-indigo-800 leading-relaxed">
          This respirator fit test was conducted in accordance with OSHA 29 CFR 1910.134 Appendix A.
          The fit test is valid for one year from the test date and must be repeated before the
          expiration date if the employee continues to use a respirator.
        </p>
      </div>
    </div>
  );
}
