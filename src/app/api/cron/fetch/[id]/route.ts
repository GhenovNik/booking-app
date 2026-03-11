import { NextRequest, NextResponse } from "next/server";
import {
  getWatch,
  insertSnapshot,
  markWatchChecked,
  getBaselinePrice,
} from "@/lib/db/queries";
import { fetchAvailability } from "@/lib/ta-api/client";
import type { AvailabilityRequest } from "@/lib/ta-api/types";
import { evaluateRules } from "@/lib/alerts/evaluate";
import { sendAlerts } from "@/lib/alerts/notify";

/**
 * POST /api/cron/fetch/[id]
 * Manually trigger a price check for a single watch.
 * Protected by x-cron-secret header (checked in middleware).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const watch = await getWatch(id);

  if (!watch) {
    return NextResponse.json({ error: "Watch not found" }, { status: 404 });
  }

  const req: AvailabilityRequest = {
    origin: watch.origin,
    destination: watch.destination,
    cabin: watch.cabin as AvailabilityRequest["cabin"],
    pax: watch.pax,
    ...(watch.mode === "fixed"
      ? { departureDate: watch.depDate ?? undefined, returnDate: watch.retDate }
      : {
          depFrom: watch.depFrom ?? undefined,
          depTo: watch.depTo ?? undefined,
          retFrom: watch.retFrom ?? undefined,
          retTo: watch.retTo ?? undefined,
        }),
  };

  try {
    const matrix = await fetchAvailability(req);
    const baseline = await getBaselinePrice(id);

    let alertCount = 0;

    for (const cell of matrix.cells) {
      if (!cell.outboundDate || cell.price <= 0) continue;

      const snap = await insertSnapshot({
        watchId: id,
        outboundDate: cell.outboundDate,
        inboundDate: cell.inboundDate ?? null,
        price: String(cell.price),
        currency: cell.currency,
        isPromo: cell.isPromo,
        raw: cell.raw,
      });

      const triggered = evaluateRules(watch.alertRules, snap, baseline);

      if (triggered.length > 0) {
        await sendAlerts(watch, triggered);
        alertCount += triggered.length;
      }
    }

    await markWatchChecked(id);

    return NextResponse.json({
      watchId: id,
      name: watch.name,
      cells: matrix.cells.length,
      alerts: alertCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron/fetch/${id}] Error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
