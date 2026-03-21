import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PayrollReportView from "./PayrollReportView";

export default async function PayrollReportPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as any)?.role || "TECHNICIAN";
  if (role !== "ADMIN") redirect("/time-clock");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <PayrollReportView />
      </div>
    </div>
  );
}
