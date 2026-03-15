import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/ringcentral";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const error = req.nextUrl.searchParams.get("error");
    if (error) {
      const desc = req.nextUrl.searchParams.get("error_description") || error;
      return NextResponse.redirect(
        new URL(`/plugins?rc=error&message=${encodeURIComponent(desc)}`, req.url)
      );
    }

    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(
        new URL("/plugins?rc=error&message=No+authorization+code+received", req.url)
      );
    }

    const result = await exchangeCode(code);

    return NextResponse.redirect(
      new URL(
        `/plugins?rc=connected&phone=${encodeURIComponent(result.phoneNumber)}`,
        req.url
      )
    );
  } catch (error: any) {
    return NextResponse.redirect(
      new URL(
        `/plugins?rc=error&message=${encodeURIComponent(error.message || "Connection failed")}`,
        req.url
      )
    );
  }
}
