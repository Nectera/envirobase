import { NextRequest, NextResponse } from "next/server";
import { gustoApiCall, getConnectionStatus } from "@/lib/gusto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const status = await getConnectionStatus();
    if (!status.connected || !status.companyId) {
      return NextResponse.json({ error: "Gusto not connected" }, { status: 401 });
    }

    // Optional query params for filtering
    const startDate = req.nextUrl.searchParams.get("start_date");
    const endDate = req.nextUrl.searchParams.get("end_date");

    let endpoint = `/v1/companies/${status.companyId}/payrolls`;
    const params: string[] = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length > 0) endpoint += `?${params.join("&")}`;

    const payrolls = await gustoApiCall("GET", endpoint);
    return NextResponse.json(payrolls);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
