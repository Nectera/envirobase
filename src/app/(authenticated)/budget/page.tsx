import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import BudgetDashboard from "./BudgetDashboard";

export const metadata = { title: "Budget vs Actuals — Xtract" };

export default async function BudgetPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/dashboard");

  return <BudgetDashboard />;
}
