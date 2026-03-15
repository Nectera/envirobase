import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { escalateOverdueTasks } from "@/lib/taskAutomation";
import TasksView from "./TasksView";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;

  // Auto-escalate overdue tasks on page load
  escalateOverdueTasks();

  // Get all workers for the assignee dropdown
  const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });
  const workerMap = new Map((workers as any[]).map((w: any) => [w.id, { id: w.id, name: w.name }]));

  // Get all tasks and enrich with worker info
  const rawTasks = await prisma.task.findMany({});
  const tasks = rawTasks.map((t: any) => ({
    ...t,
    worker: t.assignedTo ? workerMap.get(t.assignedTo) || null : null,
    assigneeName: t.assignedTo ? workerMap.get(t.assignedTo)?.name || null : null,
  }));

  // Find the current user's linked worker (for any role)
  let currentUserWorkerId: string | null = null;
  if (userId) {
    const worker = (workers as any[]).find((w: any) => w.userId === userId);
    if (worker) currentUserWorkerId = worker.id;
  }

  // For technicians, use the same ID
  const technicianWorkerId = userRole === "TECHNICIAN" ? currentUserWorkerId : null;

  return (
    <div>
      <TasksView
        tasks={tasks}
        workers={workers}
        userRole={userRole || "TECHNICIAN"}
        technicianWorkerId={technicianWorkerId}
        currentUserWorkerId={currentUserWorkerId}
      />
    </div>
  );
}
