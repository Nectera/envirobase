import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTechnician, canAccessRoute } from "@/lib/roles";
import AuthenticatedShell from "@/components/AuthenticatedShell";
import CrispChat from "@/components/CrispChat";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userRole = (session.user as any)?.role as string | undefined;
  const userName = session.user?.name || undefined;
  const isDemo = (session.user as any)?.isDemo || false;
  const isPlatformAdmin = (session.user as any)?.isPlatformAdmin || false;

  // Route protection for technicians
  const headersList = headers();
  const pathname = (headersList.get("x-next-pathname") || headersList.get("x-invoke-path") || "");

  // Alerts for non-technicians
  let alertCount = 0;
  let recentAlerts: any[] = [];
  if (!isTechnician(userRole)) {
    const allAlerts = await prisma.alert.findMany({
      where: { dismissed: false },
    });
    alertCount = allAlerts.filter((a: any) => a.severity === "critical").length;
    recentAlerts = allAlerts.slice(0, 8);
  }

  return (
    <AuthenticatedShell
      alertCount={alertCount}
      recentAlerts={recentAlerts}
      userRole={userRole}
      userName={userName}
      isDemo={isDemo}
      isPlatformAdmin={isPlatformAdmin}
    >
      {children}
      <CrispChat />
    </AuthenticatedShell>
  );
}
