/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Used to initialize the in-process cron scheduler on Docker.
 * Vercel: this file is still loaded but the scheduler no-ops (no CRON_SCHEDULE needed).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }
}
