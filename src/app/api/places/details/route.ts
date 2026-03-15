import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session } = result;

    const placeId = req.nextUrl.searchParams.get("place_id");
    if (!placeId) {
      return NextResponse.json({ error: "place_id required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "address_components,formatted_address");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === "OK" && data.result) {
      let streetNumber = "";
      let route = "";
      let city = "";
      let state = "";
      let zip = "";

      for (const component of data.result.address_components || []) {
        const type = component.types[0];
        switch (type) {
          case "street_number":
            streetNumber = component.long_name;
            break;
          case "route":
            route = component.long_name;
            break;
          case "locality":
            city = component.long_name;
            break;
          case "administrative_area_level_1":
            state = component.short_name;
            break;
          case "postal_code":
            zip = component.long_name;
            break;
        }
      }

      const address = [streetNumber, route].filter(Boolean).join(" ");
      const fullAddress = data.result.formatted_address || address;

      return NextResponse.json({
        address,
        city,
        state,
        zip,
        fullAddress,
      });
    }

    logger.error("Google Places Details error:", { status: data.status, message: data.error_message });
    return NextResponse.json({ error: data.status }, { status: 400 });
  } catch (error: any) {
    logger.error("Places details error:", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
