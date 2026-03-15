import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";

// WMO weather code → human-readable condition
const WMO_CODES: Record<number, string> = {
  0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
  45: "Fog", 48: "Depositing Rime Fog",
  51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
  56: "Light Freezing Drizzle", 57: "Dense Freezing Drizzle",
  61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
  66: "Light Freezing Rain", 67: "Heavy Freezing Rain",
  71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow",
  77: "Snow Grains",
  80: "Slight Rain Showers", 81: "Moderate Rain Showers", 82: "Violent Rain Showers",
  85: "Slight Snow Showers", 86: "Heavy Snow Showers",
  95: "Thunderstorm", 96: "Thunderstorm with Slight Hail", 99: "Thunderstorm with Heavy Hail",
};

// Wind direction from degrees
function windDirection(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

// NOAA heat index calculation (Fahrenheit)
function calcHeatIndex(tempF: number, rh: number): number {
  if (tempF < 80) return tempF;
  let hi = -42.379 + 2.04901523 * tempF + 10.14333127 * rh
    - 0.22475541 * tempF * rh - 0.00683783 * tempF * tempF
    - 0.05481717 * rh * rh + 0.00122874 * tempF * tempF * rh
    + 0.00085282 * tempF * rh * rh - 0.00000199 * tempF * tempF * rh * rh;
  if (rh < 13 && tempF >= 80 && tempF <= 112) {
    hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(tempF - 95)) / 17);
  } else if (rh > 85 && tempF >= 80 && tempF <= 87) {
    hi += ((rh - 85) / 10) * ((87 - tempF) / 5);
  }
  return Math.round(hi);
}

function cToF(c: number): number {
  return Math.round(c * 9 / 5 + 32);
}

export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session } = result;

    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

    // Step 1: Geocode address → lat/lng using Nominatim (free, no key)
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`;
    const geoRes = await fetch(geoUrl, {
      headers: { "User-Agent": "EnviroBaseApp/1.0" },
    });
    const geoData = await geoRes.json();

    if (!geoData.length) {
      return NextResponse.json({ error: "Could not geocode address" }, { status: 404 });
    }

    const lat = parseFloat(geoData[0].lat);
    const lon = parseFloat(geoData[0].lon);

    // Step 2: Fetch current weather + daily forecast from Open-Meteo (free, no key)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m`
      + `&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max,wind_direction_10m_dominant,relative_humidity_2m_mean`
      + `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Denver&forecast_days=1`;

    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    const current = weatherData.current;
    const daily = weatherData.daily;

    const currentTempF = Math.round(current.temperature_2m);
    const currentHumidity = current.relative_humidity_2m;
    const currentHeatIndex = calcHeatIndex(currentTempF, currentHumidity);

    const forecastHigh = Math.round(daily.temperature_2m_max[0]);
    const forecastLow = Math.round(daily.temperature_2m_min[0]);
    const forecastHumidity = Math.round(daily.relative_humidity_2m_mean[0]);
    const forecastHeatIndex = calcHeatIndex(forecastHigh, forecastHumidity);

    const weather = {
      currentTemp: `${currentTempF}°F`,
      currentWind: `${Math.round(current.wind_speed_10m)}mph ${windDirection(current.wind_direction_10m)}`,
      currentCondition: WMO_CODES[current.weather_code] || "Unknown",
      currentHumidity: `${currentHumidity}%`,
      currentHeatIndex: `${currentHeatIndex}°F`,
      forecastTemp: `${forecastLow}°F – ${forecastHigh}°F`,
      forecastWind: `${Math.round(daily.wind_speed_10m_max[0])}mph ${windDirection(daily.wind_direction_10m_dominant[0])}`,
      forecastCondition: WMO_CODES[daily.weather_code[0]] || "Unknown",
      forecastHumidity: `${forecastHumidity}%`,
      forecastHeatIndex: `${forecastHeatIndex}°F`,
    };

    // Step 3: Find nearest hospital via Overpass API (OpenStreetMap)
    let hospital = { name: "", address: "" };
    try {
      // Search within ~15km radius for hospitals
      const overpassQuery = `[out:json][timeout:10];(node["amenity"="hospital"](around:15000,${lat},${lon});way["amenity"="hospital"](around:15000,${lat},${lon}););out center 1;`;
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      const hospRes = await fetch(overpassUrl);
      const hospData = await hospRes.json();

      if (hospData.elements?.length > 0) {
        const h = hospData.elements[0];
        const tags = h.tags || {};
        hospital.name = tags.name || "Hospital";

        // Build address from OSM tags
        const parts = [
          tags["addr:housenumber"],
          tags["addr:street"],
          tags["addr:city"],
          tags["addr:state"],
          tags["addr:postcode"],
        ].filter(Boolean);

        if (parts.length >= 2) {
          hospital.address = parts.join(", ");
        } else {
          // Fallback: reverse geocode the hospital's coordinates
          const hLat = h.center?.lat || h.lat;
          const hLon = h.center?.lon || h.lon;
          if (hLat && hLon) {
            try {
              const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${hLat}&lon=${hLon}&format=json`;
              const revRes = await fetch(revUrl, {
                headers: { "User-Agent": "EnviroBaseApp/1.0" },
              });
              const revData = await revRes.json();
              hospital.address = revData.display_name?.split(",").slice(0, 4).join(",").trim() || "";
            } catch {
              hospital.address = `${hLat.toFixed(4)}, ${hLon.toFixed(4)}`;
            }
          }
        }
      }
    } catch {
      // Hospital lookup is best-effort — don't fail the whole request
    }

    return NextResponse.json({ weather, hospital, coordinates: { lat, lon } });
  } catch (err: any) {
    logger.error("Location lookup error:", { error: String(err) });
    return NextResponse.json({ error: "Lookup failed: " + (err.message || "unknown") }, { status: 500 });
  }
}
