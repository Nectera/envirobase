import { NextResponse } from "next/server";
import { gustoApiCall, getConnectionStatus } from "@/lib/gusto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getConnectionStatus();
    if (!status.connected || !status.companyId) {
      return NextResponse.json({ error: "Gusto not connected" }, { status: 401 });
    }

    const company = await gustoApiCall("GET", `/v1/companies/${status.companyId}`);
    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
