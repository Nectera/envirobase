"use client";

import { formatDate, hasProjectType } from "@/lib/utils";
import { TYPE_LABELS, TYPE_COLORS } from "@/lib/regulations";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle2, FolderOpen, ShieldAlert,
  Clock, Users, FileText, CalendarDays,
  ArrowRight, Flame, ClipboardList,
  Ban, Timer, AlertCircle, Palmtree,
} from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";
import BonusPoolWidget from "@/components/BonusPoolWidget";

interface DashboardViewProps {
  projects: any[];
  activeProjects: any[];
  completedProjects: any[];
  workers: any[];
  fieldWorkers: any[];
  alerts: any[];
  criticalAlerts: any[];
  certIssues: any[];
  openTasks: any[];
  overdueTasks: any[];
  urgentTasks: any[];
  openLeads: any[];
  wonLeads: any[];
  pipelineValue: number;
  openIncidents: any[];
  weekHours: number;
  uniqueWorkersThisWeek: number;
  todaySchedule: any[];
  expiringPermits: any[];
  expiredPermits: any[];
  tasks: any[];
  weekSchedule: any[];
  upcomingTimeOffs: any[];
}

function StatCard({ icon: Icon, label, value, sub, color, bg, href }: {
  icon: any; label: string; value: string | number; sub?: string; color: string; bg: string; href?: string;
}) {
  const content = (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 card-hover group">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${bg} flex-shrink-0 transition-transform group-hover:scale-105`}>
          <Icon size={17} className={color} />
        </div>
        <div className="min-w-0">
          <div className={`text-2xl font-bold stat-value ${color}`}>{value}</div>
          <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider leading-tight">{label}</div>
          {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{content}</Link> : content;
}

function SectionHeader({ title, href, linkText = "View All" }: { title: string; href?: string; linkText?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {href && <Link href={href} className="text-xs text-[#7BC143] hover:text-[#6aad38] font-medium flex items-center gap-1 transition-colors">{linkText} <ArrowRight size={10} /></Link>}
    </div>
  );
}

export default function DashboardView({
  projects,
  activeProjects,
  completedProjects,
  workers,
  fieldWorkers,
  alerts,
  criticalAlerts,
  certIssues,
  openTasks,
  overdueTasks,
  urgentTasks,
  openLeads,
  wonLeads,
  pipelineValue,
  openIncidents,
  weekHours,
  uniqueWorkersThisWeek,
  todaySchedule,
  expiringPermits,
  expiredPermits,
  tasks,
  weekSchedule,
  upcomingTimeOffs,
}: DashboardViewProps) {
  const { t } = useTranslation();
  const totalTasks = tasks.length;
  const completedTaskCount = tasks.filter((t: any) => t.status === "completed").length;

  // Project types breakdown
  const typeBreakdown = ["ASBESTOS", "LEAD", "MOLD", "METH"].map((type) => ({
    type,
    active: activeProjects.filter((p: any) => hasProjectType(p.type, type)).length,
    total: projects.filter((p: any) => hasProjectType(p.type, type)).length,
  })).filter((t) => t.total > 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{t("dashboard.title")}</h1>
        <p className="text-sm text-slate-500">EnviroBase Environmental Services — {formatDate(new Date())}</p>
      </div>

      {/* === ROW 1: Key Stats === */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard icon={FolderOpen} label={t("dashboard.activeProjects")} value={activeProjects.length} color="text-[#7BC143]" bg="bg-green-50" href="/projects" />
        <StatCard icon={ClipboardList} label={t("dashboard.openTasks")} value={openTasks.length} sub={overdueTasks.length > 0 ? `${overdueTasks.length} ${t("dashboard.overdue")}` : undefined} color="text-[#0068B5]" bg="bg-blue-50" href="/tasks" />
        <StatCard icon={Clock} label={t("dashboard.hoursThisWeek")} value={weekHours.toFixed(0)} sub={`${uniqueWorkersThisWeek} ${t("dashboard.workers")}`} color="text-slate-600" bg="bg-slate-100" href="/time-clock" />
        <StatCard icon={ShieldAlert} label={t("dashboard.certIssues")} value={certIssues.length} sub={criticalAlerts.length > 0 ? `${criticalAlerts.length} ${t("dashboard.criticalAlerts")}` : undefined} color="text-red-600" bg="bg-red-50" href="/workers" />
        <BonusPoolWidget />
      </div>

      {/* === URGENT BANNER (if any) === */}
      {(expiredPermits.length > 0 || openIncidents.length > 0 || overdueTasks.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600" />
            <span className="text-sm font-bold text-red-800">{t("dashboard.needsAttention")}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            {expiredPermits.length > 0 && (
              <span className="flex items-center gap-1.5 text-red-700">
                <FileText size={12} /> {expiredPermits.length} {expiredPermits.length > 1 ? t("dashboard.expiredPermits") : t("dashboard.expiredPermit")}
              </span>
            )}
            {expiringPermits.length > 0 && (
              <span className="flex items-center gap-1.5 text-amber-700">
                <Timer size={12} /> {expiringPermits.length} {expiringPermits.length > 1 ? t("dashboard.permitsExpiringWithin") : t("dashboard.permitExpiringWithin")}
              </span>
            )}
            {openIncidents.length > 0 && (
              <span className="flex items-center gap-1.5 text-red-700">
                <Flame size={12} /> {openIncidents.length} {openIncidents.length > 1 ? t("dashboard.openIncidents") : t("dashboard.openIncident")}
              </span>
            )}
            {overdueTasks.length > 0 && (
              <span className="flex items-center gap-1.5 text-orange-700">
                <AlertCircle size={12} /> {overdueTasks.length} {overdueTasks.length > 1 ? t("dashboard.overdueTasks") : t("dashboard.overdueTask")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* === ROW 2: Active Projects === */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Active Projects */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <SectionHeader title={t("dashboard.activeProjects")} href="/projects" />
          </div>
          <div className="p-4">
            {activeProjects.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">{t("dashboard.noActiveProjects")}</p>
            ) : (
              <div className="space-y-3">
                {activeProjects.slice(0, 6).map((p: any) => {
                  const projTasks = tasks.filter((t: any) => t.linkedEntityType === "project" && t.linkedEntityId === p.id);
                  const done = projTasks.filter((t: any) => t.status === "completed").length;
                  const pct = projTasks.length ? Math.round((done / projTasks.length) * 100) : 0;
                  const typeColor = (TYPE_COLORS as any)?.[p.type] || "#6366f1";
                  const hasIncident = openIncidents.some((i: any) => i.projectId === p.id);
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`} className="block group">
                      <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 transition">
                        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: typeColor }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800 group-hover:text-[#7BC143] transition truncate">{p.name}</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
                              {TYPE_LABELS[p.type] || p.type}
                            </span>
                            {hasIncident && (
                              <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">
                                <Flame size={9} /> Incident
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {activeProjects.length > 6 && (
                  <Link href="/projects" className="block text-center text-xs text-[#7BC143] hover:underline py-1">
                    +{activeProjects.length - 6} more projects
                  </Link>
                )}
              </div>
            )}

            {/* Project type breakdown bar */}
            {typeBreakdown.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex gap-4 text-[10px] text-slate-500">
                  {typeBreakdown.map((tb) => (
                    <span key={tb.type} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: (TYPE_COLORS as any)?.[tb.type] || "#6366f1" }} />
                      {TYPE_LABELS[tb.type] || tb.type}: <strong className="text-slate-700">{tb.active}</strong> active / {tb.total} total
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === ROW 3: Tasks + Alerts + Workforce === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Tasks Overview */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <SectionHeader title={t("dashboard.tasks")} href="/tasks" />
          </div>
          <div className="p-4">
            {/* Task donut-like summary */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#7BC143" strokeWidth="3"
                    strokeDasharray={`${totalTasks > 0 ? (completedTaskCount / totalTasks) * 88 : 0} 88`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                  {totalTasks > 0 ? Math.round((completedTaskCount / totalTasks) * 100) : 0}%
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#7BC143]" /> <span className="text-slate-500">{t("dashboard.done")}:</span> <strong>{completedTaskCount}</strong></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400" /> <span className="text-slate-500">{t("dashboard.inProgress")}:</span> <strong>{tasks.filter((t: any) => t.status === "in_progress").length}</strong></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-300" /> <span className="text-slate-500">{t("dashboard.toDo")}:</span> <strong>{tasks.filter((t: any) => t.status === "to_do").length}</strong></div>
              </div>
            </div>

            {/* Urgent / overdue tasks list */}
            {urgentTasks.length > 0 && (
              <div className="border-t border-slate-100 pt-3 mt-2">
                <p className="text-[10px] uppercase text-slate-400 tracking-wider mb-2 font-semibold">{t("dashboard.highPriority")}</p>
                <div className="space-y-1.5">
                  {urgentTasks.slice(0, 4).map((t: any) => (
                    <div key={t.id} className="flex items-start gap-2 text-xs">
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.priority === "urgent" ? "bg-red-500" : "bg-orange-400"}`} />
                      <span className="text-slate-700 leading-tight line-clamp-1">{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <SectionHeader title={t("dashboard.recentAlerts")} href="/alerts" />
          </div>
          <div className="p-3 space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">{t("dashboard.noActiveAlerts")}</p>
            ) : (
              alerts.slice(0, 6).map((a: any) => {
                const borderColor =
                  a.severity === "critical" ? "border-l-red-500 bg-red-50/50" :
                  a.severity === "warning" ? "border-l-amber-500 bg-amber-50/50" :
                  "border-l-blue-500 bg-blue-50/50";
                return (
                  <div key={a.id} className={`pl-3 pr-4 py-2 border-l-[3px] rounded-r-2xl ${borderColor}`}>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-1">{a.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{a.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Workforce & Scheduling */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <SectionHeader title={t("dashboard.workforce")} href="/workers" />
          </div>
          <div className="p-4 space-y-4">
            {/* Today's schedule */}
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <CalendarDays size={12} />
                <span className="font-semibold">{t("dashboard.todaysSchedule")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-[#7BC143]">{todaySchedule.length}</div>
                <div className="text-xs text-slate-500">worker{todaySchedule.length !== 1 ? "s" : ""} {t("dashboard.scheduled")}</div>
              </div>
            </div>

            {/* This week stats */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div className="text-center">
                <div className="text-lg font-bold text-sky-600">{weekHours.toFixed(0)}h</div>
                <div className="text-[10px] text-slate-400">{t("dashboard.hoursThisWeek")}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-slate-700">{uniqueWorkersThisWeek}</div>
                <div className="text-[10px] text-slate-400">{t("dashboard.activeWorkers")}</div>
              </div>
            </div>

            {/* Field worker summary */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Users size={10} /> {fieldWorkers.length} {t("dashboard.fieldWorkersTotal")}
                {certIssues.length > 0 && (
                  <span className="ml-auto text-red-500 font-medium">{certIssues.length} {certIssues.length !== 1 ? t("dashboard.certIssues") : t("dashboard.certIssue")}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === ROW 4: Week Schedule + Time Off === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* This Week's Schedule */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <SectionHeader title={t("dashboard.weekSchedule")} href="/schedule" />
          </div>
          <div className="p-4">
            {weekSchedule.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">{t("dashboard.noScheduledWork")}</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  // Group schedule entries by date
                  const byDate: Record<string, any[]> = {};
                  for (const entry of weekSchedule) {
                    const d = entry.date || "unknown";
                    if (!byDate[d]) byDate[d] = [];
                    byDate[d].push(entry);
                  }
                  const sortedDates = Object.keys(byDate).sort();
                  const todayStr = new Date().toISOString().split("T")[0];
                  return sortedDates.slice(0, 5).map((date) => {
                    const isToday = date === todayStr;
                    const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                    const entries = byDate[date];
                    return (
                      <div key={date} className={`p-2.5 rounded-2xl ${isToday ? "bg-green-50 border border-green-100" : "bg-slate-50"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[11px] font-semibold ${isToday ? "text-green-700" : "text-slate-600"}`}>
                            {isToday && "● "}{dayLabel}
                          </span>
                          <span className="text-[10px] text-slate-400">{entries.length} worker{entries.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {entries.slice(0, 5).map((e: any, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                              {e.workerName || "Worker"}
                            </span>
                          ))}
                          {entries.length > 5 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">
                              +{entries.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming PTO */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <SectionHeader title={t("dashboard.upcomingPTO")} href="/calendar" />
          </div>
          <div className="p-4">
            {upcomingTimeOffs.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-sm text-slate-400">{t("dashboard.noPTO")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingTimeOffs.slice(0, 6).map((to: any) => (
                  <div key={to.id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-blue-50 border border-blue-100">
                    <div className="p-1.5 rounded-full bg-blue-100">
                      <Palmtree size={12} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">{to.workerName || "Employee"}</div>
                      <div className="text-[10px] text-slate-500">
                        {formatDate(to.startDate)} — {formatDate(to.endDate)}
                        {to.reason && <span className="ml-1.5 text-blue-600">({to.reason})</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {upcomingTimeOffs.length > 6 && (
                  <Link href="/calendar" className="block text-center text-xs text-[#7BC143] hover:underline py-1">
                    +{upcomingTimeOffs.length - 6} more
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === ROW 5: Compliance === */}
      <div className="grid grid-cols-1 gap-4">
        {/* Compliance & Permits */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <SectionHeader title={t("dashboard.compliancePermits")} href="/projects" />
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {typeBreakdown.length > 0 ? typeBreakdown.map((tb) => (
                <div key={tb.type} className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-50">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: (TYPE_COLORS as any)?.[tb.type] || "#6366f1" }} />
                  <div>
                    <div className="text-xs font-semibold text-slate-700">{TYPE_LABELS[tb.type] || tb.type}</div>
                    <div className="text-[10px] text-slate-400">{tb.active} {t("dashboard.active")} / {tb.total} {t("dashboard.total")}</div>
                  </div>
                </div>
              )) : (
                <p className="col-span-2 text-sm text-slate-400 text-center py-2">No projects</p>
              )}
            </div>
            {/* Permit status */}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <FileText size={12} />
                <span className="font-semibold">{t("dashboard.permitStatus")}</span>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span className="text-slate-600">
                    {activeProjects.length - expiredPermits.length - expiringPermits.length} {t("dashboard.current")}
                  </span>
                </div>
                {expiringPermits.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Timer size={12} className="text-amber-500" />
                    <span className="text-amber-700">{expiringPermits.length} {t("dashboard.expiringSoon")}</span>
                  </div>
                )}
                {expiredPermits.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Ban size={12} className="text-red-500" />
                    <span className="text-red-700">{expiredPermits.length} {t("dashboard.expired")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
