"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Menu, AlertTriangle, ShieldAlert, FileText, Clock, X, ChevronRight, AtSign, Check } from "lucide-react";
import { useMobileNav } from "./MobileNavProvider";
import { useTranslation } from "./LanguageProvider";
import GlobalSearch from "./GlobalSearch";

const PAGE_INFO: Record<string, { title: string; color: string }> = {
  "/dashboard": { title: "Dashboard", color: "#7BC143" },
  "/crm": { title: "CRM", color: "#7BC143" },
  "/projects": { title: "Projects", color: "#0068B5" },
  "/schedule": { title: "Schedule", color: "#0068B5" },
  "/time-clock": { title: "Time Clock", color: "#6366f1" },
  "/workers": { title: "Team", color: "#6366f1" },
  "/tasks": { title: "Tasks", color: "#f59e0b" },
  "/calendar": { title: "Calendar", color: "#f59e0b" },
  "/leads": { title: "Leads", color: "#7BC143" },
  "/pipeline": { title: "Pipeline", color: "#7BC143" },
  "/estimates": { title: "Estimates", color: "#7BC143" },
  "/companies": { title: "Companies", color: "#7BC143" },
  "/contacts": { title: "Contacts", color: "#7BC143" },
  "/metrics": { title: "Metrics", color: "#7BC143" },
  "/chat": { title: "Chat", color: "#06b6d4" },
  "/bonus-pool": { title: "Bonus Pool", color: "#6366f1" },
  "/alerts": { title: "Alerts", color: "#ef4444" },
  "/settings": { title: "Settings", color: "#64748b" },
  "/data-management": { title: "Data Management", color: "#64748b" },
  "/invoices": { title: "Invoices", color: "#7BC143" },
  "/my-documents": { title: "My Documents", color: "#6366f1" },
};

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "warning" | "info";
  date: string;
  dismissed: boolean;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  fromName: string | null;
  createdAt: string;
}

export default function AlertsHeader({ alertCount = 0, alerts = [], userName }: { alertCount?: number; alerts?: Alert[]; userName?: string }) {
  const { open } = useMobileNav();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const pageInfo = PAGE_INFO[pathname] || PAGE_INFO["/" + (pathname.split("/")[1] || "")] || null;
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"alerts" | "mentions">("alerts");
  const panelRef = useRef<HTMLDivElement>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter((n: Notification) => !n.read).length);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close panel on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPanel]);

  const severityConfig = {
    critical: { icon: ShieldAlert, bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    warning: { icon: AlertTriangle, bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    info: { icon: FileText, bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  };

  const recentAlerts = alerts.slice(0, 8);
  const totalCount = alertCount + unreadCount;

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.read) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notif.id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }
    // Navigate to the linked page
    if (notif.link) {
      setShowPanel(false);
      router.push(notif.link);
    }
  };

  return (
    <div className="sticky top-0 z-30">
      {/* Green accent strip */}
      <div className="h-[3px] bg-gradient-to-r from-[#7BC143] via-[#7BC143] to-[#0068B5]" />
      <div
        className="flex items-center gap-3 px-3 md:px-6 py-2.5"
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Hamburger — mobile only */}
        <button
          onClick={open}
          className="md:hidden p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Menu size={22} />
        </button>

        {/* Page title section — desktop only */}
        {pageInfo && (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pageInfo.color }} />
            <span className="text-sm font-semibold text-slate-700 tracking-tight">{pageInfo.title}</span>
          </div>
        )}

        {/* Global search */}
        <div className="flex-1 mx-2 md:mx-4 md:max-w-md">
          <GlobalSearch />
        </div>

        <div className="flex-1" />

        {/* Company name — desktop only */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 flex-shrink-0">
          <span className="font-medium tracking-wide">EnviroBase</span>
        </div>

        {/* Notification bell with dropdown */}
        <div className="relative" ref={panelRef}>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          title={t("alerts.title")}
        >
          <Bell size={20} />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
              {totalCount}
            </span>
          )}
        </button>

        {/* User avatar — desktop only */}
        {userName && (
          <div className="hidden md:flex items-center flex-shrink-0 ml-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #7BC143, #0068B5)" }} title={userName}>
              {userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
            </div>
          </div>
        )}

        {/* Dropdown panel */}
        {showPanel && (
          <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
            {/* Header with tabs */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("alerts")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    activeTab === "alerts"
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Alerts {alertCount > 0 && `(${alertCount})`}
                </button>
                <button
                  onClick={() => setActiveTab("mentions")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
                    activeTab === "mentions"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <AtSign size={10} />
                  Mentions {unreadCount > 0 && `(${unreadCount})`}
                </button>
              </div>
              <button onClick={() => setShowPanel(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X size={14} />
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {/* Alerts Tab */}
              {activeTab === "alerts" && (
                <>
                  {recentAlerts.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">{t("alerts.noAlerts")}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {recentAlerts.map((alert) => {
                        const config = severityConfig[alert.severity] || severityConfig.info;
                        const Icon = config.icon;
                        const timeAgo = getTimeAgo(alert.date);
                        return (
                          <div key={alert.id} className="flex gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors">
                            <div className={`mt-0.5 p-1.5 rounded-lg ${config.bg} flex-shrink-0`}>
                              <Icon size={14} className={config.text} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{alert.title}</p>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{alert.message}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                <span className="text-[10px] text-slate-400 capitalize">{alert.severity}</span>
                                <span className="text-[10px] text-slate-400">&middot;</span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                  <Clock size={9} /> {timeAgo}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Mentions Tab */}
              {activeTab === "mentions" && (
                <>
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <AtSign size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">No mentions yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.slice(0, 20).map((notif) => {
                        const timeAgo = getTimeAgo(notif.createdAt);
                        return (
                          <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors ${
                              !notif.read ? "bg-indigo-50/30" : ""
                            }`}
                          >
                            <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-50 flex-shrink-0">
                              <AtSign size={14} className="text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm truncate ${!notif.read ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                                )}
                              </div>
                              {notif.message && (
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{notif.message}</p>
                              )}
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-1">
                                <Clock size={9} /> {timeAgo}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
              {activeTab === "alerts" ? (
                <Link
                  href="/alerts"
                  onClick={() => setShowPanel(false)}
                  className="flex items-center justify-center gap-1 flex-1 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  {t("alerts.viewAll")} <ChevronRight size={12} />
                </Link>
              ) : (
                <>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 py-1.5 px-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Check size={12} /> Mark all read
                    </button>
                  )}
                  <div className="flex-1" />
                </>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
