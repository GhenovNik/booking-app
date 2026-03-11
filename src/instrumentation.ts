/**
 * Next.js instrumentation hook — runs once when the server starts.
 * 1. Runs pending DB migrations automatically (Docker + Vercel).
 * 2. Starts the in-process cron scheduler (Docker only).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Run DB migrations on startup so the schema is always up to date.
    // Safe to run multiple times — Drizzle tracks applied migrations.
    try {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      const { db } = await import("@/lib/db");
      const path = await import("path");
      await migrate(db, {
        migrationsFolder: path.join(process.cwd(), "migrations"),
      });
      console.log("[startup] DB migrations applied.");
    } catch (err) {
      console.error("[startup] Migration failed:", err);
      // Don't crash — allow app to start; DB errors will surface per-request.
    }

    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }
}
