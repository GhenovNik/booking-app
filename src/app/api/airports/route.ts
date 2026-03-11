import { NextRequest, NextResponse } from "next/server";
import { searchPortCache, isPortCacheStale, upsertPortCache } from "@/lib/db/queries";
import { fetchPortList } from "@/lib/ta-api/client";
import { searchStaticAirports } from "@/lib/airports-static";

/**
 * GET /api/airports?q=ams
 * Search airports by IATA code, city, or name.
 * Priority: DB cache (from TA API) → static fallback.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ airports: [] });
  }

  // Refresh TA API cache in background if stale — don't block the search
  isPortCacheStale().then(async (stale) => {
    if (!stale) return;
    try {
      const ports = await fetchPortList();
      if (ports.length > 0) {
        await upsertPortCache(ports);
        console.info(`[airports] Port cache refreshed: ${ports.length} entries`);
      }
    } catch (err) {
      console.warn("[airports] Failed to refresh port cache:", err);
    }
  });

  let airports = await searchPortCache(q);

  // Fall back to static list if DB cache is empty (TA API not configured yet)
  if (airports.length === 0) {
    airports = searchStaticAirports(q).map((a) => ({
      iataCode: a.iataCode,
      name: a.name,
      city: a.city,
      country: a.country,
      updatedAt: new Date(),
    }));
  }

  return NextResponse.json({
    airports: airports.map((a) => ({
      iataCode: a.iataCode,
      name: a.name,
      city: a.city,
      country: a.country,
    })),
  });
}
