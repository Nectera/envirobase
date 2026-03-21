import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isTechnician, isOffice, isSupervisor } from "@/lib/roles";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (isTechnician(userRole)) {
    redirect("/schedule");
  } else if (isOffice(userRole)) {
    redirect("/crm");
  } else if (isSupervisor(userRole)) {
    redirect("/projects");
  } else {
    redirect("/dashboard");
  }
}
