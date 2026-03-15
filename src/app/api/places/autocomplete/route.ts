import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = req.nextUrl.searchParams.get("input");
    if (!input || input.length < 3) {
      return NextResponse.json({ predictions: [] });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("types", "address");
    url.searchParams.set("components", "country:us");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === "OK") {
      return NextResponse.json({
        predictions: data.predictions.map((p: any) => ({
          description: p.description,
          place_id: p.place_id,
        })),
      });
    }

    if (data.status === "ZERO_RESULTS") {
      return NextResponse.json({ predictions: [] });
    }

    // Log the error server-side for debugging
    logger.error("Google Places API error:", { status: data.status, message: data.error_message });
    return NextResponse.json({ predictions: [], error: data.status });
  } catch (error: any) {
    logger.error("Places autocomplete error:", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
