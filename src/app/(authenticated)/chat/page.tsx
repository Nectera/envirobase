import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChatView from "./ChatView";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string;
  const userName = (session?.user as any)?.name as string;
  const userRole = (session?.user as any)?.role as string;

  // Fetch all users for @mention autocomplete and DM creation
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  // Also fetch all workers so we can show team members who don't have login accounts yet
  const workers = await prisma.worker.findMany({
    select: { id: true, name: true, email: true, role: true, userId: true, position: true },
    where: { status: { not: "inactive" } },
    orderBy: { name: "asc" },
  });

  // Merge: use User records for workers with accounts, add Worker-only entries for those without
  const userIds = new Set(users.map((u: any) => u.id));
  const workerUserIds = new Set(
    workers.filter((w: any) => w.userId).map((w: any) => w.userId)
  );

  // Workers without user accounts — they need "Create Login" before they can fully use chat
  const workersWithoutAccounts = workers
    .filter((w: any) => !w.userId)
    .map((w: any) => ({
      id: `worker:${w.id}`,
      name: w.name,
      email: w.email || null,
      role: w.role || w.position || "TECHNICIAN",
      needsAccount: true,
      workerId: w.id,
    }));

  // All users + workers without accounts
  const allUsers = [
    ...users.map((u: any) => ({ ...u, needsAccount: false, workerId: null })),
    ...workersWithoutAccounts,
  ].sort((a: any, b: any) => a.name.localeCompare(b.name));

  return (
    <ChatView
      currentUserId={userId}
      currentUserName={userName}
      currentUserRole={userRole}
      allUsers={allUsers}
    />
  );
}
