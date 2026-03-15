"use client";

import { useState } from "react";
import { X, Sparkles, MapPin, Clock, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Loader2, Users, Calendar, Navigation, Star } from "lucide-react";

type Project = {
  id: string;
  name: string;
  type: string;
  address: string;
  startDate: string | null;
  estEndDate?: string | null;
  status: string;
  [key: string]: any;
};

type WorkerRec = {
  workerId: string;
  name: string;
  role: string;
  skillRating: number;
  homeCity: string;
  distance: string;
  distanceMiles: number | null;
  driveTime: string;
  availableDays: string;
  availableDaysNum: number;
  totalDays: number;
  hasMatchingCertType: boolean;
  certifications: string[];
  score: number;
  breakdown: {
    proximity: number;
    availability: number;
    certMatch: number;
    skillMatch: number;
  };
};

const DIFFICULTY_LABELS: Record<number, string> = { 1: "Easy", 2: "Mild", 3: "Medium", 4: "Hard", 5: "Very Hard" };
const DIFFICULTY_COLORS: Record<number, string> = { 1: "bg-green-100 text-green-800", 2: "bg-lime-100 text-lime-800", 3: "bg-amber-100 text-amber-800", 4: "bg-orange-100 text-orange-800", 5: "bg-red-100 text-red-800" };

type SuggestionResult = {
  project: { name: string; address: string; type: string; city: string; difficultyRating: number };
  dateRange: { start: string; end: string; workingDays: number };
  crewSizeNeeded: number;
  recommendations: WorkerRec[];
  topPick: string[];
  summary: string;
};

const TYPE_COLORS: Record<string, string> = {
  ASBESTOS: "bg-indigo-100 text-indigo-700",
  LEAD: "bg-amber-100 text-amber-700",
  METH: "bg-red-100 text-red-700",
  MOLD: "bg-teal-100 text-teal-700",
  SELECT_DEMO: "bg-orange-100 text-orange-700",
  REBUILD: "bg-violet-100 text-violet-700",
  SELECT_DEMO_REBUILD: "bg-orange-100 text-orange-700",
};

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 bg-emerald-50";
  if (score >= 60) return "text-amber-600 bg-amber-50";
  return "text-slate-500 bg-slate-50";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  return "Fair";
}

export default function AIAutoScheduleModal({
  projects,
  onClose,
  onCreated,
}: {
  projects: Project[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<"select" | "review" | "creating">("select");
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [crewSize, setCrewSize] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creatingCount, setCreatingCount] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);

  const activeProjects = projects.filter(
    (p) => p.status !== "completed" && p.status !== "cancelled"
  );

  // Auto-fill dates when project changes
  function handleProjectChange(id: string) {
    setProjectId(id);
    const proj = projects.find((p) => p.id === id);
    if (proj) {
      if (proj.startDate && !startDate) {
        const s = new Date(proj.startDate);
        if (s >= new Date()) setStartDate(proj.startDate);
      }
      if (proj.estEndDate && !endDate) {
        setEndDate(proj.estEndDate);
      }
    }
  }

  async function handleGetRecommendations() {
    if (!projectId || !startDate) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/schedule/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          startDate,
          endDate: endDate || undefined,
          crewSize: crewSize || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get recommendations");
      }
      const data: SuggestionResult = await res.json();
      setResult(data);
      // Pre-select top picks
      const topSet = new Set<string>();
      data.recommendations.slice(0, data.crewSizeNeeded).forEach((r) => topSet.add(r.workerId));
      setSelected(topSet);
      setStep("review");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleWorker(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!result) return;
    setStep("creating");
    setCreatingCount(selected.size);
    setCreatedCount(0);

    // Build date array (weekdays only)
    const dates: string[] = [];
    const d = new Date(result.dateRange.start);
    const end = new Date(result.dateRange.end);
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        dates.push(d.toISOString().split("T")[0]);
      }
      d.setDate(d.getDate() + 1);
    }

    let count = 0;
    for (const workerId of Array.from(selected)) {
      try {
        await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workerId,
            projectId,
            dates,
            shift: "full",
            hours: 8,
          }),
        });
        count++;
        setCreatedCount(count);
      } catch {
        // continue with others
      }
    }

    setTimeout(() => {
      onCreated();
      onClose();
    }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">AI Auto-Schedule</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ─── Step 1: Select ─── */}
          {step === "select" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Select a project and date range. The AI will recommend the best crew based on proximity, availability, and certifications.
              </p>

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                <select
                  value={projectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a project...</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type}) — {p.address || "No address"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Leave blank to auto-detect from estimate</p>
                </div>
              </div>

              {/* Crew Size */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Crew Size</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={crewSize}
                  onChange={(e) => setCrewSize(e.target.value ? parseInt(e.target.value) : "")}
                  placeholder="Auto-detect from estimate"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-slate-400 mt-1">Leave blank to use estimate crew size</p>
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
              {/* Project Info */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-slate-900">{result.project.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[result.project.type] || "bg-slate-100 text-slate-600"}`}>
                    {result.project.type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {result.project.address || "No address"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(result.dateRange.start).toLocaleDateString()} — {new Date(result.dateRange.end).toLocaleDateString()}
                    ({result.dateRange.workingDays} work days)
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> Crew: {result.crewSizeNeeded}
                  </span>
                  {result.project.difficultyRating && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-[10px] ${DIFFICULTY_COLORS[result.project.difficultyRating] || "bg-slate-100 text-slate-600"}`}>
                      Difficulty: {DIFFICULTY_LABELS[result.project.difficultyRating] || result.project.difficultyRating}
                      {result.project.difficultyRating >= 4 && " — Skill weighted heavy"}
                    </span>
                  )}
                </div>
              </div>

              {/* Selection count */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Recommendations ({result.recommendations.length})
                </span>
                <span className="text-xs text-indigo-600 font-medium">
                  {selected.size} selected of {result.crewSizeNeeded} needed
                </span>
              </div>

              {/* Worker Cards */}
              <div className="space-y-2">
                {result.recommendations.map((rec) => {
                  const isSelected = selected.has(rec.workerId);
                  const isExpanded = expanded.has(rec.workerId);
                  return (
                    <div
                      key={rec.workerId}
                      className={`rounded-lg border transition-all ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-50/50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleWorker(rec.workerId)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600"
                              : "border-slate-300 hover:border-indigo-400"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </button>

                        {/* Main Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-slate-900">{rec.name}</span>
                              <span className="flex items-center gap-0.5">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} size={10} className={s <= (rec.skillRating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                                ))}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 capitalize">{rec.role}</span>
                            {rec.hasMatchingCertType && (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                                Cert Match
                              </span>
                            )}
                            {!rec.hasMatchingCertType && (
                              <span title="No matching certification type"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {rec.homeCity}
                            </span>
                            <span className="flex items-center gap-1">
                              <Navigation className="w-3 h-3" /> {rec.distance}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {rec.driveTime}
                            </span>
                            <span>Avail: {rec.availableDays} days</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className={`px-2.5 py-1 rounded-lg text-center ${scoreColor(rec.score)}`}>
                            <div className="text-lg font-bold leading-none">{rec.score}</div>
                            <div className="text-[10px] font-medium mt-0.5">{scoreLabel(rec.score)}</div>
                          </div>
                          <button
                            onClick={() => toggleExpanded(rec.workerId)}
                            className="p-1 hover:bg-slate-200 rounded"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Breakdown */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-slate-100">
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="text-center">
                              <div className="text-slate-400 mb-0.5">Proximity</div>
                              <div className="font-semibold text-slate-700">{rec.breakdown.proximity}</div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${rec.breakdown.proximity}%` }} />
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-slate-400 mb-0.5">Availability</div>
                              <div className="font-semibold text-slate-700">{rec.breakdown.availability}</div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${rec.breakdown.availability}%` }} />
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-slate-400 mb-0.5">Cert Match</div>
                              <div className="font-semibold text-slate-700">{rec.breakdown.certMatch}</div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${rec.breakdown.certMatch}%` }} />
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-slate-400 mb-0.5">Skill Match</div>
                              <div className="font-semibold text-slate-700">{rec.breakdown.skillMatch}</div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${rec.breakdown.skillMatch}%` }} />
                              </div>
                            </div>
                          </div>
                          {rec.certifications.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {rec.certifications.map((c, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Step 3: Creating ─── */}
          {step === "creating" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              {createdCount < creatingCount ? (
                <>
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="text-sm text-slate-600">
                    Creating assignments... {createdCount}/{creatingCount}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {createdCount} worker{createdCount !== 1 ? "s" : ""} assigned successfully!
                  </p>
                  <p className="text-xs text-slate-500">Refreshing schedule...</p>
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
                  Cancel
                </button>
                <button
                  onClick={handleGetRecommendations}
                  disabled={!projectId || !startDate || loading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {loading ? "Analyzing..." : "Get Recommendations"}
                </button>
              </>
            )}
            {step === "review" && (
              <>
                <button
                  onClick={() => { setStep("select"); setResult(null); }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={selected.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Users className="w-4 h-4" />
                  Assign {selected.size} Worker{selected.size !== 1 ? "s" : ""} ({result?.dateRange.workingDays} days)
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
