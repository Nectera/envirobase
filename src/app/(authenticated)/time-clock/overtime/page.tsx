import { requireOrg } from "@/lib/org-context";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";
import OvertimeApprovalsView from "./OvertimeApprovalsView";

export const dynamic = "force-dynamic";

export default async function OvertimeApprovalsPage() {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) redirect("/dashboard");
  const { session } = auth;
  const role = (session?.user as any)?.role;
  if (!isAdmin(role)) redirect("/dashboard");

  return <OvertimeApprovalsView />;
}
