import { NextRequest, NextResponse } from "next/server";
import { getWatch } from "@/lib/db/queries";

/**
 * POST /api/cron/fetch/[id]
 * Manually trigger a price check for a single watch.
 * Protected by x-cron-secret header (checked in middleware).
 *
 * TODO Phase 1: add TA API fetch + snapshot insert + alert evaluation.
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

  // TODO Phase 1: fetch prices, store snapshots, send alerts
  console.log(`[cron/fetch/${id}] Manual trigger for "${watch.name}" — TA API pending.`);

  return NextResponse.json({
    watchId: id,
    name: watch.name,
    message: "TA API not yet configured — Phase 1 pending.",
  });
}
