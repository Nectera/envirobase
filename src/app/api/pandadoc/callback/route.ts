import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// OAuth callback no longer needed — PandaDoc uses API key auth
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/plugins", req.url));
}
