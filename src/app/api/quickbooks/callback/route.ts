import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/quickbooks";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = req.url;

    // Check for error from Intuit
    const error = req.nextUrl.searchParams.get("error");
    if (error) {
      return NextResponse.redirect(
        new URL(`/plugins?qb=error&message=${encodeURIComponent(error)}`, req.url)
      );
    }

    // Exchange the authorization code for tokens
    const result = await exchangeCode(url);

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL(`/plugins?qb=connected&company=${encodeURIComponent(result.companyName)}`, req.url)
    );
  } catch (error: any) {
    return NextResponse.redirect(
      new URL(`/plugins?qb=error&message=${encodeURIComponent(error.message || "Connection failed")}`, req.url)
    );
  }
}
