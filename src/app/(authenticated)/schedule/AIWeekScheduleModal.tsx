"use client";

import { useState } from "react";
import {
  X, Sparkles, MapPin, Clock, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Loader2, Users, Calendar, Navigation, Star, Briefcase, UserMinus, ArrowRight,
} from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

const TYPE_COLORS: Record<string, string> = {
  ASBESTOS: "bg-indigo-100 text-indigo-700", LEAD: "bg-amber-100 text-amber-700",
  METH: "bg-red-100 text-red-700", MOLD: "bg-teal-100 text-teal-700",
  SELECT_DEMO: "bg-orange-100 text-orange-700", REBUILD: "bg-violet-100 text-violet-700",
  SELECT_DEMO_REBUILD: "bg-orange-100 text-orange-700",
};

const DIFFICULTY_LABELS: Record<number, string> = { 1: "Easy", 2: "Mild", 3: "Medium", 4: "Hard", 5: "Very Hard" };
const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-700", 2: "bg-lime-100 text-lime-700",
  3: "bg-amber-100 text-amber-700", 4: "bg-orange-100 text-orange-700",
  5: "bg-red-100 text-red-700",
};

type ProjectSlot = {
  projectId: string;
  projectName: string;
  projectType: string;
  address: string;
  city: string;
  difficultyRating: number;
  crewSize: number;
  daysNeeded: number;
  assignedWorkers: WorkerAssignment[];
};

type WorkerAssignment = {
  workerId: string;
  name: string;
  role: string;
  skillRating: number;
  homeCity: string;
  distance: string;
  distanceMiles: number | null;
  driveTime: string;
  hasMatchingCertType: boolean;
  score: number;
  days: string[];
};

type UnassignedWorker = {
  workerId: string;
  name: string;
  role: string;
  homeCity: string;
  availableDays: number;
};

type WeekResult = {
  weekStart: string;
  weekEnd: string;
  weekDates: string[];
  projects: ProjectSlot[];
  unassignedWorkers: UnassignedWorker[];
  totalWorkers: number;
  totalAssignments: number;
  summary: string;
};

function formatDateShort(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getNextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day; // if Sunday, next day; else next Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-slate-500 bg-slate-50 border-slate-200";
}

export default function AIWeekScheduleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"select" | "review" | "creating">("select");
  const [weekStart, setWeekStart] = useState(getNextMonday());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WeekResult | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [deselectedWorkers, setDeselectedWorkers] = useState<Set<string>>(new Set()); // workerId-projectId pairs
  const [creatingCount, setCreatingCount] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  const [showUnassigned, setShowUnassigned] = useState(false);

  // Ensure weekStart is always a Monday
  function handleDateChange(val: string) {
    const d = new Date(val + "T12:00:00");
    const day = d.getDay();
    if (day !== 1) {
      // Snap to the Monday of that week
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
    }
    setWeekStart(d.toISOString().split("T")[0]);
  }

  async function handleGenerate() {
    if (!weekStart) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/schedule/suggest-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate: weekStart }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate schedule");
      }
      const data: WeekResult = await res.json();
      setResult(data);
      // Auto-expand all projects
      setExpandedProjects(new Set(data.projects.map((p) => p.projectId)));
      setDeselectedWorkers(new Set());
      setStep("review");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleProjectExpanded(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  function toggleWorkerSelection(workerId: string, projectId: string) {
    const key = `${workerId}-${projectId}`;
    setDeselectedWorkers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function isWorkerSelected(workerId: string, projectId: string) {
    return !deselectedWorkers.has(`${workerId}-${projectId}`);
  }

  // Count total assignments that will be created
  function getSelectedAssignmentCount() {
    if (!result) return 0;
    let count = 0;
    for (const slot of result.projects) {
      for (const aw of slot.assignedWorkers) {
        if (isWorkerSelected(aw.workerId, slot.projectId)) count++;
      }
    }
    return count;
  }

  async function handleCreate() {
    if (!result) return;
    setStep("creating");

    // Collect all assignments to create
    const assignments: { workerId: string; projectId: string; dates: string[] }[] = [];
    for (const slot of result.projects) {
      for (const aw of slot.assignedWorkers) {
        if (isWorkerSelected(aw.workerId, slot.projectId)) {
          assignments.push({
            workerId: aw.workerId,
            projectId: slot.projectId,
            dates: aw.days,
          });
        }
      }
    }

    setCreatingCount(assignments.length);
    setCreatedCount(0);

    let count = 0;
    for (const assignment of assignments) {
      try {
        await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workerId: assignment.workerId,
            projectId: assignment.projectId,
            dates: assignment.dates,
            shift: "full",
            hours: 8,
          }),
        });
        count++;
        setCreatedCount(count);
      } catch {
        // continue
      }
    }

    setTimeout(() => {
      onCreated();
      onClose();
    }, 1200);
  }

  const selectedCount = getSelectedAssignmentCount();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("schedule.aiWeekSchedule")}</h2>
              <p className="text-xs text-slate-500">{t("schedule.autoDistributeCrew")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ─── Step 1: Select Week ─── */}
          {step === "select" && (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-8 h-8 text-indigo-600" />
                </div>
                <p className="text-sm text-slate-500">
                  {t("schedule.selectWeek")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("schedule.weekStarting")}</label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {weekStart && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    {formatDateShort(weekStart)} — {formatDateShort(
                      (() => {
                        const d = new Date(weekStart + "T12:00:00");
                        d.setDate(d.getDate() + 4);
                        return d.toISOString().split("T")[0];
                      })()
                    )}
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ─── Step 2: Review ─── */}
          {step === "review" && result && (
            <div className="space-y-4">
              {/* Week Summary Bar */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium text-slate-800">
                    {formatDateShort(result.weekStart)} — {formatDateShort(result.weekEnd)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-purple-500" />
                  <span className="text-slate-600">{result.projects.length} projects</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-600">{result.totalAssignments} {t("common.assigned")} / {result.totalWorkers} {t("schedule.workers")}</span>
                </div>
                {result.unassignedWorkers.length > 0 && (
                  <button
                    onClick={() => setShowUnassigned(!showUnassigned)}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    {result.unassignedWorkers.length} {t("schedule.unassigned")}
                  </button>
                )}
              </div>

              {/* Unassigned Workers (collapsible) */}
              {showUnassigned && result.unassignedWorkers.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">{t("schedule.unassignedWorkers")}</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.unassignedWorkers.map((w) => (
                      <div key={w.workerId} className="text-xs bg-white border border-amber-200 rounded px-2 py-1 text-slate-600">
                        {w.name} <span className="text-slate-400">— {w.homeCity} — {w.availableDays} {t("schedule.dayAnyway")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No projects message */}
              {result.projects.length === 0 && (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">{t("schedule.noActiveProjects")}</p>
                  <p className="text-xs text-slate-400 mt-1">{t("schedule.ensureProjectDates")}</p>
                </div>
              )}

              {/* Project Cards */}
              {result.projects.map((slot) => {
                const isExpanded = expandedProjects.has(slot.projectId);
                const filledCount = slot.assignedWorkers.filter((aw) =>
                  isWorkerSelected(aw.workerId, slot.projectId)
                ).length;
                const isFull = filledCount >= slot.crewSize;
                const isShort = filledCount < slot.crewSize && slot.assignedWorkers.length > 0;

                return (
                  <div
                    key={slot.projectId}
                    className={`rounded-lg border transition-all ${
                      isFull ? "border-emerald-200 bg-emerald-50/30" :
                      isShort ? "border-amber-200 bg-amber-50/20" :
                      slot.assignedWorkers.length === 0 ? "border-red-200 bg-red-50/20" :
                      "border-slate-200 bg-white"
                    }`}
                  >
                    {/* Project Header */}
                    <button
                      onClick={() => toggleProjectExpanded(slot.projectId)}
                      className="w-full flex items-center justify-between p-3 text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isFull ? "bg-emerald-500" : isShort ? "bg-amber-500" : "bg-red-400"
                        }`} />
                        <span className="font-medium text-sm text-slate-900 truncate">{slot.projectName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[slot.projectType] || "bg-slate-100 text-slate-600"}`}>
                          {slot.projectType}
                        </span>
                        {slot.difficultyRating && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${DIFFICULTY_COLORS[slot.difficultyRating] || ""}`}>
                            {DIFFICULTY_LABELS[slot.difficultyRating]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className={`font-semibold ${isFull ? "text-emerald-600" : isShort ? "text-amber-600" : "text-red-500"}`}>
                            {filledCount}/{slot.crewSize}
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {/* Project Details + Workers */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-slate-100">
                        {/* Project info */}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 py-2">
                          {slot.address && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {slot.address}</span>
                          )}
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {slot.daysNeeded} day{slot.daysNeeded !== 1 ? "s" : ""} this week</span>
                        </div>

                        {/* Worker rows */}
                        {slot.assignedWorkers.length > 0 ? (
                          <div className="space-y-1.5 mt-1">
                            {slot.assignedWorkers.map((aw) => {
                              const selected = isWorkerSelected(aw.workerId, slot.projectId);
                              return (
                                <div
                                  key={aw.workerId}
                                  className={`flex items-center gap-2.5 p-2 rounded-lg transition ${
                                    selected ? "bg-white border border-slate-200" : "bg-slate-100/50 border border-transparent opacity-50"
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => toggleWorkerSelection(aw.workerId, slot.projectId)}
                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                                      selected ? "bg-indigo-600 border-indigo-600" : "border-slate-300 hover:border-indigo-400"
                                    }`}
                                  >
                                    {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                  </button>

                                  {/* Worker Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-slate-800">{aw.name}</span>
                                      <span className="flex items-center gap-0.5">
                                        {[1,2,3,4,5].map((s) => (
                                          <Star key={s} size={9} className={s <= (aw.skillRating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                                        ))}
                                      </span>
                                      <span className="text-[10px] text-slate-400 capitalize">{aw.role}</span>
                                      {aw.hasMatchingCertType && (
                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded font-medium">Cert</span>
                                      )}
                                      {!aw.hasMatchingCertType && (
                                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 text-[10px] text-slate-400 mt-0.5">
                                      <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {aw.homeCity}</span>
                                      <span className="flex items-center gap-0.5"><Navigation className="w-2.5 h-2.5" /> {aw.distance}</span>
                                      <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {aw.driveTime}</span>
                                      <span>{aw.days.length} day{aw.days.length !== 1 ? "s" : ""}</span>
                                    </div>
                                  </div>

                                  {/* Score */}
                                  <div className={`px-2 py-0.5 rounded text-xs font-bold border ${scoreColor(aw.score)}`}>
                                    {aw.score}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 text-center py-3 bg-red-50 rounded-lg mt-1">
                            No workers could be assigned — all workers are busy or no matching criteria found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Step 3: Creating ─── */}
          {step === "creating" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              {createdCount < creatingCount ? (
                <>
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="text-sm text-slate-600">
                    {t("schedule.creatingAssignments")} {createdCount}/{creatingCount}
                  </p>
                  <div className="w-48 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${(createdCount / creatingCount) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {t("schedule.weekScheduledSuccess")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {createdCount} {t("schedule.workerAssignments")}{createdCount !== 1 ? "s" : ""} {t("schedule.across")} {result?.projects.filter((p) => p.assignedWorkers.length > 0).length} {t("schedule.project")}{(result?.projects.filter((p) => p.assignedWorkers.length > 0).length || 0) !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== "creating" && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
            {step === "select" && (
              <>
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                  {t("schedule.cancel")}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!weekStart || loading}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {loading ? t("schedule.analyzingWorkforce") : t("schedule.generateWeek")}
                </button>
              </>
            )}
            {step === "review" && (
              <>
                <button
                  onClick={() => { setStep("select"); setResult(null); }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  {t("schedule.back")}
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {selectedCount} assignment{selectedCount !== 1 ? "s" : ""} {t("schedule.across")} {result?.projects.filter((p) =>
                      p.assignedWorkers.some((aw) => isWorkerSelected(aw.workerId, p.projectId))
                    ).length} {t("schedule.project")}{(result?.projects.filter((p) => p.assignedWorkers.some((aw) => isWorkerSelected(aw.workerId, p.projectId))).length || 0) !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={handleCreate}
                    disabled={selectedCount === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t("schedule.confirmSchedule")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
