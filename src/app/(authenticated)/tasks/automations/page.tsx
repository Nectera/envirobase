import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AutomationsView from "./AutomationsView";

export default async function AutomationsPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role as string | undefined;

  // Only admin/supervisor/office can access automations
  if (userRole === "TECHNICIAN") {
    redirect("/tasks");
  }

  const rules = await prisma.taskAutomationRule.findMany();
  const templates = await prisma.taskTemplate.findMany();
  const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <AutomationsView rules={rules} templates={templates} workers={workers} />
    </div>
  );
}
