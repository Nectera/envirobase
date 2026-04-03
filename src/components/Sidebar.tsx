"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Home, FolderOpen, Users, ClipboardCheck, LogOut,
  Clock, ClipboardList, Building2, Calendar, CalendarDays, FileText,
  Target, LayoutDashboard, Receipt, CheckSquare, TrendingUp,
  Settings, X, Database, UserPlus, Bell, MessageSquare, DollarSign,
  PanelLeftClose, PanelLeftOpen, Gift, Puzzle, Shield, Lock, ChevronDown,
} from "lucide-react";
import { FEATURE_ROUTE_MAP, hasFeature } from "@/lib/feature-flags";
import { useMobileNav } from "./MobileNavProvider";
import Logo from "./Logo";
import { useTranslation } from "./LanguageProvider";
import ChatUnreadBadge from "./ChatUnreadBadge";
import { useSidebarCollapse } from "./SidebarCollapseProvider";
import type { OrgBranding } from "@/lib/org-branding";

const crmPaths = ["/crm", "/leads", "/companies", "/contacts", "/pipeline", "/estimates"];

type NavItem = { href: string; labelKey: string; icon: any };

export default function Sidebar({
  userRole,
  userName,
  isDemo,
  isPlatformAdmin,
  branding,
}: {
  alertCount?: number;
  userRole?: string;
  userName?: string;
  isDemo?: boolean;
  isPlatformAdmin?: boolean;
  branding?: OrgBranding;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { isOpen, close } = useMobileNav();
  const { collapsed, toggle } = useSidebarCollapse();
  const isTech = userRole === "TECHNICIAN";
  const isOffice = userRole === "OFFICE";
  const isSupervisor = userRole === "SUPERVISOR";
  const isPM = userRole === "PROJECT_MANAGER";
  const isAdmin = userRole === "ADMIN";

  const crmNavItems: NavItem[] = [
    { href: "/crm", labelKey: "sidebar.crmDashboard", icon: LayoutDashboard },
    { href: "/leads", labelKey: "sidebar.leads", icon: Target },
    { href: "/pipeline", labelKey: "sidebar.pipeline", icon: TrendingUp },
    { href: "/estimates", labelKey: "sidebar.estimating", icon: Receipt },
    { href: "/companies", labelKey: "sidebar.companies", icon: Building2 },
    { href: "/contacts", labelKey: "sidebar.contacts", icon: Users },
    { href: "/tasks", labelKey: "sidebar.tasks", icon: CheckSquare },
    { href: "/calendar", labelKey: "sidebar.calendar", icon: CalendarDays },
  ];

  // Hide Estimates on mobile
  const mobileHiddenCrmPaths = ["/estimates"];

  const pmNavItems: NavItem[] = [
    { href: "/dashboard", labelKey: "sidebar.dashboard", icon: Home },
    { href: "/projects", labelKey: "sidebar.projects", icon: FolderOpen },
    { href: "/tasks", labelKey: "sidebar.tasks", icon: CheckSquare },
    { href: "/schedule", labelKey: "sidebar.schedule", icon: Calendar },
    { href: "/compliance", labelKey: "sidebar.compliance", icon: ClipboardCheck },
  ];

  const teamFinanceNavItems: NavItem[] = [
    { href: "/time-clock", labelKey: "sidebar.timeClock", icon: Clock },
    ...(userRole === "ADMIN" ? [
      { href: "/payroll", labelKey: "sidebar.payroll", icon: Receipt },
    ] : []),
    { href: "/bonus-pool", labelKey: "sidebar.bonusPool", icon: Gift },
    ...(userRole === "ADMIN" ? [
      { href: "/budget", labelKey: "sidebar.budget", icon: TrendingUp },
    ] : []),
  ];

  const settingsNavItems: NavItem[] = [
    { href: "/workers", labelKey: "sidebar.team", icon: Users },
    { href: "/company", labelKey: "sidebar.company", icon: Building2 },
    { href: "/data-management", labelKey: "sidebar.dataManagement", icon: Database },
    { href: "/plugins", labelKey: "sidebar.plugins", icon: Puzzle },
    { href: "/settings/notifications", labelKey: "sidebar.notifications", icon: Bell },
    { href: "/settings", labelKey: "sidebar.settings", icon: Settings },
  ];

  const pmSettingsNavItems: NavItem[] = [
    { href: "/workers", labelKey: "sidebar.team", icon: Users },
    { href: "/data-management", labelKey: "sidebar.dataManagement", icon: Database },
    { href: "/settings/notifications", labelKey: "sidebar.notifications", icon: Bell },
  ];

  const technicianNavItems: NavItem[] = [
    { href: "/schedule", labelKey: "sidebar.mySchedule", icon: Calendar },
    { href: "/time-clock", labelKey: "sidebar.timeClock", icon: Clock },
    { href: "/bonus-pool", labelKey: "sidebar.bonusPool", icon: Gift },
    { href: "/my-documents", labelKey: "sidebar.myDocuments", icon: FileText },
    { href: "/tasks", labelKey: "sidebar.myTasks", icon: CheckSquare },
    { href: "/compliance", labelKey: "sidebar.compliance", icon: ClipboardCheck },
  ];

  const supervisorNavItems: NavItem[] = [
    { href: "/projects", labelKey: "sidebar.projects", icon: FolderOpen },
    { href: "/schedule", labelKey: "sidebar.schedule", icon: Calendar },
    { href: "/time-clock", labelKey: "sidebar.timeClock", icon: Clock },
    { href: "/bonus-pool", labelKey: "sidebar.bonusPool", icon: Gift },
    { href: "/compliance", labelKey: "sidebar.compliance", icon: ClipboardCheck },
  ];

  const chatNavItem = () => {
    const isActive = pathname === "/chat" || pathname.startsWith("/chat/");
    return (
      <Link
        key="/chat"
        href="/chat"
        onClick={close}
        className={`sidebar-item ${isActive ? "sidebar-item-active" : ""} ${collapsed ? "sidebar-item-collapsed" : ""}`}
        title={collapsed ? t("sidebar.chat") : undefined}
      >
        <MessageSquare size={16} />
        {!collapsed && <span className="flex-1">{t("sidebar.chat")}</span>}
        {!collapsed && <ChatUnreadBadge />}
      </Link>
    );
  };

  const features = branding?.features || {};

  const renderNavItem = (item: NavItem, mobileHidden = false) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    // Check if this route requires a feature the org doesn't have
    const requiredFeature = FEATURE_ROUTE_MAP[item.href];
    const isLocked = !isDemo && requiredFeature && !hasFeature(features, requiredFeature as any);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={close}
        className={`sidebar-item ${isActive ? "sidebar-item-active" : ""}${mobileHidden ? " hidden md:flex" : ""} ${collapsed ? "sidebar-item-collapsed" : ""}${isLocked ? " opacity-40" : ""}`}
        title={collapsed ? t(item.labelKey) : undefined}
      >
        <Icon size={16} />
        {!collapsed && <span className="flex-1">{t(item.labelKey)}</span>}
        {!collapsed && isLocked && <Lock size={12} className="text-slate-500" />}
      </Link>
    );
  };

  const subtitleKey = isTech ? "sidebar.myPortal" : isOffice ? "sidebar.salesPortal" : isSupervisor ? "sidebar.myPortal" : isPM ? "sidebar.pms" : "sidebar.pms";

  // Check if a section contains the active route
  const sectionHasActive = useCallback((items: NavItem[]) => {
    return items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  }, [pathname]);

  // Track which sections are collapsed (default: all open)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isSectionOpen = useCallback((key: string, items: NavItem[]) => {
    if (collapsedSections[key] !== undefined) return !collapsedSections[key];
    return true;
  }, [collapsedSections]);

  // --- iOS pull-to-refresh prevention for mobile sidebar ---
  const mobileOverlayRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const touchStartY = useRef(0);

  useEffect(() => {
    const overlay = mobileOverlayRef.current;
    if (!overlay || !isOpen) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const nav = mobileNavRef.current;
      const target = e.target as Node;

      // If touch is inside the scrollable nav, allow it unless at scroll boundaries
      if (nav && nav.contains(target)) {
        const dy = e.touches[0].clientY - touchStartY.current;
        const atTop = nav.scrollTop <= 0;
        const atBottom = nav.scrollTop + nav.clientHeight >= nav.scrollHeight - 1;

        // Block pull-down at top (triggers refresh) or pull-up at bottom (bounce)
        if ((atTop && dy > 0) || (atBottom && dy < 0)) {
          e.preventDefault();
        }
        return;
      }

      // Touch is on backdrop, logo, footer — block everything
      e.preventDefault();
    };

    overlay.addEventListener("touchstart", onTouchStart, { passive: true });
    overlay.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      overlay.removeEventListener("touchstart", onTouchStart);
      overlay.removeEventListener("touchmove", onTouchMove);
    };
  }, [isOpen]);

  // Callback ref to capture the <nav> element for touch interception
  const navRefCallback = useCallback((node: HTMLElement | null) => {
    mobileNavRef.current = node;
  }, []);

  const sectionDivider = (
    <div className="mx-4 my-2 border-t border-white/[0.06]" />
  );

  const renderCollapsibleSection = (labelKey: string, items: NavItem[], mobileHiddenFn?: (href: string) => boolean) => {
    const open = isSectionOpen(labelKey, items);
    const hasActive = sectionHasActive(items);

    return (
      <>
        {collapsed ? (
          <div className="mx-4 my-2 border-t border-white/[0.06]" />
        ) : (
          <button
            onClick={() => toggleSection(labelKey)}
            className="w-full flex items-center justify-between px-5 py-1.5 group cursor-pointer"
          >
            <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${hasActive && !open ? "text-emerald-400/70" : "text-slate-500 group-hover:text-slate-400"}`}>
              {t(labelKey)}
            </span>
            <ChevronDown
              size={12}
              className={`text-slate-500 group-hover:text-slate-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
            />
          </button>
        )}
        <div className={`overflow-hidden transition-all duration-200 ease-in-out ${open || collapsed ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
          {items.map((item) => renderNavItem(item, mobileHiddenFn ? mobileHiddenFn(item.href) : false))}
        </div>
      </>
    );
  };

  const sidebarContent = (
    <>
      <div className={`${collapsed ? "px-2 py-5" : "px-5 py-5"} flex items-center justify-center relative flex-shrink-0`}>
        <Logo size={collapsed ? 36 : 72} src={branding?.logoUrl} />
        {/* Close button — mobile only */}
        <button onClick={close} className="md:hidden absolute right-4 p-1.5 text-slate-400 hover:text-white rounded-xl">
          <X size={20} />
        </button>
      </div>

      <nav ref={navRefCallback} className="flex-1 py-1 overflow-y-auto relative z-10 scrollbar-hide" style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
        {isTech && (
          <>
            {technicianNavItems.map((item) => renderNavItem(item))}
            {sectionDivider}
            {chatNavItem()}
          </>
        )}
        {isOffice && (
          <>
            {crmNavItems.map((item) => renderNavItem(item, mobileHiddenCrmPaths.includes(item.href)))}
            {sectionDivider}
            {chatNavItem()}
          </>
        )}
        {isSupervisor && (
          <>
            {supervisorNavItems.map((item) => renderNavItem(item))}
            {sectionDivider}
            {chatNavItem()}
          </>
        )}
        {isPM && (
          <>
            {chatNavItem()}
            {sectionDivider}
            {renderCollapsibleSection("sidebar.projectManagement", pmNavItems)}
            {sectionDivider}
            {renderCollapsibleSection("sidebar.teamFinance", teamFinanceNavItems)}
            {sectionDivider}
            {renderCollapsibleSection("sidebar.settings", pmSettingsNavItems)}
          </>
        )}
        {isAdmin && (
          <>
            {chatNavItem()}
            {sectionDivider}
            {renderCollapsibleSection("sidebar.projectManagement", pmNavItems)}
            {sectionDivider}
            {renderCollapsibleSection("sidebar.teamFinance", teamFinanceNavItems)}
            {sectionDivider}
            {renderCollapsibleSection("sidebar.salesCrm", crmNavItems, (href) => mobileHiddenCrmPaths.includes(href))}
            {sectionDivider}
            {renderCollapsibleSection("sidebar.settings", settingsNavItems)}
            {isPlatformAdmin && (
              <>
                {sectionDivider}
                {renderCollapsibleSection("sidebar.platform", [
                  { href: "/admin", labelKey: "sidebar.platformAdmin", icon: Shield },
                ])}
              </>
            )}
          </>
        )}
      </nav>

      <div className="border-t border-white/[0.06] p-4 mx-2 space-y-3 flex-shrink-0">
        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggle}
          className="hidden md:flex sidebar-item w-full text-slate-500 hover:text-slate-300 !mx-0 !px-2 justify-center"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          {!collapsed && <span className="text-xs flex-1">Collapse</span>}
        </button>
        {!collapsed && (isTech || isOffice || isSupervisor) && userName && (
          <div className="text-xs text-slate-400 font-medium">{userName}</div>
        )}
        {(isTech || isOffice || isSupervisor) && !isPM && (
          <Link
            href="/settings/notifications"
            onClick={close}
            className={`sidebar-item w-full text-slate-500 hover:text-slate-300 !mx-0 !px-2 ${collapsed ? "sidebar-item-collapsed" : ""}`}
            title={collapsed ? t("sidebar.notifications") : undefined}
          >
            <Bell size={14} />
            {!collapsed && <span className="text-xs">{t("sidebar.notifications")}</span>}
          </Link>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`sidebar-item w-full text-slate-500 hover:text-red-400 !mx-0 !px-2 ${collapsed ? "sidebar-item-collapsed" : ""}`}
          title={collapsed ? t("sidebar.signOut") : undefined}
        >
          <LogOut size={14} />
          {!collapsed && <span className="text-xs">{t("sidebar.signOut")}</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — floating translucent panel */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 text-slate-300 fixed top-4 left-4 bottom-4 z-40 transition-all duration-300 ease-in-out ${
          collapsed ? "w-[72px]" : "w-[232px]"
        }`}
        style={{
          borderRadius: "24px",
          overflow: "hidden",
          background: "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.12)",
        }}
      >
        <div className="absolute inset-0 rounded-[24px] pointer-events-none opacity-[0.06]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ffffff' stop-opacity='1'/%3E%3Cstop offset='50%25' stop-color='%23ffffff' stop-opacity='0.3'/%3E%3Cstop offset='100%25' stop-color='%23000000' stop-opacity='0.8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20Z' fill='url(%23a)' stroke='%23ffffff' stroke-opacity='0.8' stroke-width='0.5'/%3E%3Cpath d='M20 4 L36 20 L20 36 L4 20Z' fill='none' stroke='%23ffffff' stroke-opacity='0.5' stroke-width='0.3'/%3E%3C/svg%3E")`, backgroundSize: "40px 40px" }} />
        <div className="relative z-10 flex flex-col h-full">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile overlay sidebar — always expanded */}
      {isOpen && (
        <div ref={mobileOverlayRef} className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
          {/* Sidebar panel */}
          <aside
            className="relative w-72 text-slate-300 flex flex-col h-full z-10 overflow-hidden"
            style={{
              background: "rgba(15, 23, 42, 0.92)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              overscrollBehavior: "contain",
            }}
          >
            <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ffffff' stop-opacity='1'/%3E%3Cstop offset='50%25' stop-color='%23ffffff' stop-opacity='0.3'/%3E%3Cstop offset='100%25' stop-color='%23000000' stop-opacity='0.8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20Z' fill='url(%23a)' stroke='%23ffffff' stroke-opacity='0.8' stroke-width='0.5'/%3E%3Cpath d='M20 4 L36 20 L20 36 L4 20Z' fill='none' stroke='%23ffffff' stroke-opacity='0.5' stroke-width='0.3'/%3E%3C/svg%3E")`, backgroundSize: "40px 40px" }} />
            <div className="relative z-10 flex flex-col h-full">
              {sidebarContent}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
