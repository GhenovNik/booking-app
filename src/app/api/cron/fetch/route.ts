import { NextResponse } from "next/server";
import { getWatchesDue } from "@/lib/db/queries";

/**
 * POST /api/cron/fetch
 * Protected by x-cron-secret header (checked in middleware).
 *
 * This is the entry point for the scheduled price check.
 * Phase 1 (TA API) will add the actual fetch logic here.
 * For now it returns the list of watches that are due.
 */
export async function POST() {
  const result = await getWatchesDue();
  const due = result.rows;

  if (due.length === 0) {
    return NextResponse.json({ checked: 0, message: "No watches due." });
  }

  // TODO Phase 1: for each watch, call TA API adapter, store snapshots, evaluate alerts
  // For now: just report what would be checked
  console.log(`[cron] ${due.length} watch(es) due:`, due.map((w) => w.name));

  return NextResponse.json({
    checked: 0,
    due: due.map((w) => ({ id: w.id, name: w.name })),
    message: "TA API not yet configured — Phase 1 pending.",
  });
}
