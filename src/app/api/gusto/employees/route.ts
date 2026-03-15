import { NextResponse } from "next/server";
import { gustoApiCall, getConnectionStatus } from "@/lib/gusto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getConnectionStatus();
    if (!status.connected || !status.companyId) {
      return NextResponse.json({ error: "Gusto not connected" }, { status: 401 });
    }

    const employees = await gustoApiCall("GET", `/v1/companies/${status.companyId}/employees`);
    return NextResponse.json(employees);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
