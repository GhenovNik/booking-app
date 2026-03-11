import { NextResponse } from "next/server";
import {
  getWatchesDue,
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
 * POST /api/cron/fetch
 * Protected by x-cron-secret header (checked in middleware).
 * Called by node-cron (Docker) or Vercel Cron.
 */
export async function POST() {
  const result = await getWatchesDue();
  const due = result.rows;

  if (due.length === 0) {
    return NextResponse.json({ checked: 0, message: "No watches due." });
  }

  const summary: {
    id: number;
    name: string;
    cells: number;
    alerts: number;
    error?: string;
  }[] = [];

  for (const row of due) {
    try {
      const watch = await getWatch(row.id);
      if (!watch) continue;

      const req: AvailabilityRequest = {
        origin: row.origin,
        destination: row.destination,
        cabin: row.cabin as AvailabilityRequest["cabin"],
        pax: row.pax,
        ...(row.mode === "fixed"
          ? { departureDate: row.dep_date ?? undefined, returnDate: row.ret_date }
          : {
              depFrom: row.dep_from ?? undefined,
              depTo: row.dep_to ?? undefined,
              retFrom: row.ret_from ?? undefined,
              retTo: row.ret_to ?? undefined,
            }),
      };

      const matrix = await fetchAvailability(req);
      const baseline = await getBaselinePrice(row.id);

      let alertCount = 0;

      for (const cell of matrix.cells) {
        if (!cell.outboundDate || cell.price <= 0) continue;

        const snap = await insertSnapshot({
          watchId: row.id,
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

      await markWatchChecked(row.id);

      summary.push({
        id: row.id,
        name: row.name,
        cells: matrix.cells.length,
        alerts: alertCount,
      });
      console.log(
        `[cron] ✓ ${row.name}: ${matrix.cells.length} cells, ${alertCount} alerts`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron] ✗ Watch ${row.id} (${row.name}): ${message}`);
      summary.push({ id: row.id, name: row.name, cells: 0, alerts: 0, error: message });
    }
  }

  return NextResponse.json({ checked: due.length, results: summary });
}
