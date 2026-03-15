import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    message: "PandaDoc uses API key authentication. Add your key via Settings > PandaDoc.",
  });
}
