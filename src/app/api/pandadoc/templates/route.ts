import { NextRequest, NextResponse } from "next/server";
import { pdApiCall, isConnected } from "@/lib/pandadoc";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isConnected())) {
    return NextResponse.json({ error: "PandaDoc not connected" }, { status: 401 });
  }

  try {
    const search = req.nextUrl.searchParams.get("q") || "";
    const endpoint = search ? `/templates?q=${encodeURIComponent(search)}` : "/templates";
    const data = await pdApiCall("GET", endpoint);
    return NextResponse.json(data.results || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
