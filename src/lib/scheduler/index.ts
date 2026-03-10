import cron from "node-cron";

let started = false;

/**
 * Start the in-process cron scheduler (Docker only).
 * Calls /api/cron/fetch on the configured schedule.
 *
 * In Vercel, this is replaced by vercel.json cron config pointing to the same endpoint.
 */
export function startScheduler() {
  if (started) return;
  started = true;

  const schedule = process.env.CRON_SCHEDULE ?? "0 */12 * * *";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET ?? "";

  if (!cron.validate(schedule)) {
    console.error(`[scheduler] Invalid CRON_SCHEDULE: "${schedule}"`);
    return;
  }

  console.log(`[scheduler] Starting with schedule: ${schedule}`);

  cron.schedule(schedule, async () => {
    console.log("[scheduler] Triggering price check...");
    try {
      const res = await fetch(`${appUrl}/api/cron/fetch`, {
        method: "POST",
        headers: { "x-cron-secret": cronSecret },
      });
      const body = await res.json();
      console.log("[scheduler] Result:", body);
    } catch (err) {
      console.error("[scheduler] Fetch failed:", err);
    }
  });
}
