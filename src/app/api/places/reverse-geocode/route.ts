import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/places/reverse-geocode?lat=...&lng=...
 * Reverse-geocode lat/lng → human-readable address using Nominatim (free, no key).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;

    const lat = req.nextUrl.searchParams.get("lat");
    const lng = req.nextUrl.searchParams.get("lng");
    if (!lat || !lng) {
      return NextResponse.json({ error: "lat and lng parameters required" }, { status: 400 });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "EnviroBaseApp/1.0" },
    });
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: "Could not reverse geocode" }, { status: 404 });
    }

    // Build a short, readable address from components
    const addr = data.address || {};
    const parts = [
      addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : addr.road,
      addr.city || addr.town || addr.village || addr.hamlet,
      addr.state,
    ].filter(Boolean);

    return NextResponse.json({
      address: parts.join(", ") || data.display_name || "Unknown location",
      fullAddress: data.display_name || "",
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    });
  } catch (error: any) {
    console.error("Reverse geocode error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
