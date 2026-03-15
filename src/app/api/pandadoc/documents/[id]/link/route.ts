import { NextRequest, NextResponse } from "next/server";
import { pdApiCall, isConnected } from "@/lib/pandadoc";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isConnected())) {
    return NextResponse.json({ error: "PandaDoc not connected" }, { status: 401 });
  }

  try {
    const link = await pdApiCall("POST", `/documents/${params.id}/session`);
    return NextResponse.json(link);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
