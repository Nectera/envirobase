import { NextRequest, NextResponse } from "next/server";
import { rcApiCall, isConnected } from "@/lib/ringcentral";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!(await isConnected())) {
      return NextResponse.json({ error: "RingCentral not connected" }, { status: 503 });
    }

    const dateFrom = request.nextUrl.searchParams.get("dateFrom");
    const dateTo = request.nextUrl.searchParams.get("dateTo");
    const phoneNumber = request.nextUrl.searchParams.get("phoneNumber");

    const params = new URLSearchParams({
      view: "Simple",
      perPage: "50",
    });

    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (phoneNumber) params.set("phoneNumber", phoneNumber);

    const result = await rcApiCall("GET", `/account/~/extension/~/call-log?${params.toString()}`);

    return NextResponse.json({
      records: result.records || [],
      totalCount: result.paging?.totalElements || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
