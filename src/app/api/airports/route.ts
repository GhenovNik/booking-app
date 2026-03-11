import { NextRequest, NextResponse } from "next/server";
import { searchPortCache, isPortCacheStale, upsertPortCache } from "@/lib/db/queries";
import { fetchPortList } from "@/lib/ta-api/client";

/**
 * GET /api/airports?q=ams
 * Search airports by IATA code, city, or name.
 * Refreshes the port cache from TA API if stale (>24h) or empty.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ airports: [] });
  }

  // Refresh cache in background if stale — don't block the search
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

  const airports = await searchPortCache(q);

  return NextResponse.json({
    airports: airports.map((a) => ({
      iataCode: a.iataCode,
      name: a.name,
      city: a.city,
      country: a.country,
    })),
  });
}
