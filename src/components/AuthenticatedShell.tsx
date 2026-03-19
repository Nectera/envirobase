"use client";

import { useState, useEffect, ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import AlertsHeader from "@/components/AlertsHeader";
import AIAssistant from "@/components/AIAssistant";
import MobileNavProvider from "@/components/MobileNavProvider";
import SidebarCollapseProvider, { useSidebarCollapse } from "@/components/SidebarCollapseProvider";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PullToRefresh from "@/components/PullToRefresh";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";
import GlobalNotesPanel from "@/components/GlobalNotesPanel";
import type { OrgBranding } from "@/lib/org-branding";

interface AuthenticatedShellProps {
  alertCount: number;
  recentAlerts: any[];
  userRole?: string;
  userName?: string;
  isDemo?: boolean;
  isPlatformAdmin?: boolean;
  branding?: OrgBranding;
  children: ReactNode;
}

function ShellContent({
  alertCount,
  recentAlerts,
  userRole,
  userName,
  isDemo,
  isPlatformAdmin,
  children,
}: AuthenticatedShellProps) {
  const { collapsed } = useSidebarCollapse();

  return (
    <>
      {/* Clean background — gradient is applied via globals.css body */}

      <div className="flex h-screen relative">
        <Sidebar alertCount={alertCount} userRole={userRole} userName={userName} isDemo={isDemo} isPlatformAdmin={isPlatformAdmin} />

        {/* Main content — offset for floating sidebar on desktop */}
        <div
          className={`flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-300 ease-in-out ${
            collapsed ? "md:ml-[104px]" : "md:ml-[264px]"
          }`}
        >
          {/* Demo Read-Only Banner */}
          {isDemo && (
            <div className="bg-amber-500 text-white text-center py-2 px-4 text-xs font-medium flex items-center justify-center gap-2 flex-shrink-0">
              <span>You&apos;re viewing a read-only demo</span>
              <span className="hidden sm:inline">—</span>
              <a
                href="mailto:sales@envirobase.app"
                className="underline underline-offset-2 hover:text-amber-100 transition-colors hidden sm:inline"
              >
                Contact us to get started
              </a>
            </div>
          )}
          <AlertsHeader alertCount={alertCount} alerts={recentAlerts} userName={userName} />
          <main className="flex-1 overflow-auto p-3 md:p-6 relative z-[1]">
            <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
          </main>
        </div>

        <AIAssistant />
        <GlobalNotesPanel />
        <PWAInstallPrompt />
        <PullToRefresh />
      </div>
    </>
  );
}

/**
 * Client-only authenticated shell.
 * Renders a loading skeleton during SSR / before mount to prevent
 * hydration mismatches from browser-only APIs (DOMPurify, localStorage,
 * window.matchMedia, etc.) used by child components.
 */
export default function AuthenticatedShell(props: AuthenticatedShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen bg-slate-50">
        {/* Sidebar skeleton */}
        <div className="hidden md:block w-[264px] bg-white border-r border-slate-100" />
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="h-14 border-b border-slate-100 bg-white/70" />
          <main className="flex-1 overflow-auto p-3 md:p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 rounded w-48" />
              <div className="h-4 bg-slate-100 rounded w-72" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <MobileNavProvider>
      <SidebarCollapseProvider>
        <ShellContent {...props} />
      </SidebarCollapseProvider>
    </MobileNavProvider>
  );
}
