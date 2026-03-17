import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BonusPoolView from "./BonusPoolView";

export const dynamic = "force-dynamic";

export default async function BonusPoolPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const isAdmin = user?.role === "ADMIN";
  const userEmail = user?.email || "";

  // Get all workers for the high performer picker and headcount display
  const workers = await prisma.worker.findMany({
    where: { status: "active" },
    select: { id: true, name: true, position: true, email: true },
  });

  // Match logged-in user to their worker record by email
  const currentWorker = (workers as any[]).find(
    (w) => w.email?.toLowerCase() === userEmail.toLowerCase()
  );
  const userPosition = currentWorker?.position || null;

  return (
    <BonusPoolView
      isAdmin={isAdmin}
      workers={workers as any[]}
      userPosition={userPosition}
    />
  );
}
