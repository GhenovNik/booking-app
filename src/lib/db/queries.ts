import { db } from "./index";
import { watches, alertRules, priceSnapshots, notifications, portCache } from "./schema";
import { eq, desc, sql, ilike, or } from "drizzle-orm";
import type { NewWatch, NewAlertRule, NewPriceSnapshot } from "./schema";
import type { PortEntry } from "@/lib/ta-api/types";

// ─── Watches ──────────────────────────────────────────────────────────────────

export async function listWatches() {
  return db.query.watches.findMany({
    orderBy: [desc(watches.createdAt)],
    with: {
      alertRules: { where: eq(alertRules.isActive, true) },
    },
  });
}

export async function getWatch(id: number) {
  return db.query.watches.findFirst({
    where: eq(watches.id, id),
    with: { alertRules: true },
  });
}

export async function createWatch(data: NewWatch) {
  const [watch] = await db.insert(watches).values(data).returning();
  return watch;
}

export async function updateWatch(id: number, data: Partial<NewWatch>) {
  const [watch] = await db
    .update(watches)
    .set(data)
    .where(eq(watches.id, id))
    .returning();
  return watch;
}

export async function deleteWatch(id: number) {
  await db.delete(watches).where(eq(watches.id, id));
}

// ─── Alert rules ──────────────────────────────────────────────────────────────

export async function createAlertRule(data: NewAlertRule) {
  const [rule] = await db.insert(alertRules).values(data).returning();
  return rule;
}

export async function deleteAlertRule(id: number) {
  await db.delete(alertRules).where(eq(alertRules.id, id));
}

// ─── Price snapshots ──────────────────────────────────────────────────────────

export async function insertSnapshot(data: NewPriceSnapshot) {
  const [snap] = await db.insert(priceSnapshots).values(data).returning();
  return snap;
}

/** Latest price per date pair for a given watch (for matrix view) */
export async function getLatestMatrix(watchId: number) {
  return db.execute(sql`
    SELECT DISTINCT ON (outbound_date, inbound_date)
      outbound_date, inbound_date, price, currency, is_promo, checked_at
    FROM price_snapshots
    WHERE watch_id = ${watchId}
    ORDER BY outbound_date, inbound_date, checked_at DESC
  `);
}

/** Min price per day (for history chart) */
export async function getPriceHistory(watchId: number) {
  return db.execute(sql`
    SELECT
      date_trunc('day', checked_at) AS day,
      MIN(price::numeric)           AS min_price,
      currency
    FROM price_snapshots
    WHERE watch_id = ${watchId}
    GROUP BY day, currency
    ORDER BY day ASC
  `);
}

// ─── Scheduler helper ─────────────────────────────────────────────────────────

/** Returns watches due for a check right now */
export async function getWatchesDue() {
  return db.execute<{
    id: number;
    name: string;
    origin: string;
    destination: string;
    mode: string;
    dep_date: string | null;
    ret_date: string | null;
    dep_from: string | null;
    dep_to: string | null;
    ret_from: string | null;
    ret_to: string | null;
    pax: number;
    cabin: string;
    fetch_interval_h: number;
    last_checked_at: string | null;
  }>(sql`
    SELECT *
    FROM watches
    WHERE is_active = true
      AND (
        last_checked_at IS NULL
        OR last_checked_at < now() - make_interval(hours => fetch_interval_h)
      )
  `);
}

// ─── Notifications ─────────────────────────────────────────────────────────────

/** Check if a notification was sent for this watch+rule+dates within 24h */
export async function wasNotifiedRecently(
  watchId: number,
  ruleId: number,
  outboundDate: string,
  inboundDate: string | null
) {
  const rows = await db.execute(sql`
    SELECT 1
    FROM notifications n
    JOIN price_snapshots s ON s.id = n.snapshot_id
    WHERE n.watch_id  = ${watchId}
      AND n.rule_id   = ${ruleId}
      AND s.outbound_date = ${outboundDate}
      AND (${inboundDate}::date IS NULL OR s.inbound_date = ${inboundDate}::date)
      AND n.sent_at > now() - interval '24 hours'
    LIMIT 1
  `);
  return rows.rows.length > 0;
}

export async function insertNotification(data: {
  watchId: number;
  ruleId: number;
  snapshotId: bigint;
  chatId: string;
  price: string;
  messageId?: string;
}) {
  await db.insert(notifications).values(data);
}

// ─── Watch — scheduler updates ────────────────────────────────────────────────

/** Mark a watch as just checked (updates last_checked_at to now). */
export async function markWatchChecked(id: number) {
  await db
    .update(watches)
    .set({ lastCheckedAt: new Date() })
    .where(eq(watches.id, id));
}

// ─── Price snapshots — baseline for percent_drop rules ────────────────────────

/**
 * Returns the oldest known price for a watch (used as baseline for
 * percent_drop alert rules). Returns null if no snapshots exist yet.
 */
export async function getBaselinePrice(watchId: number): Promise<number | null> {
  const rows = await db.execute<{ price: string }>(sql`
    SELECT price::text
    FROM price_snapshots
    WHERE watch_id = ${watchId}
    ORDER BY checked_at ASC
    LIMIT 1
  `);
  const row = rows.rows[0];
  return row ? Number(row.price) : null;
}

// ─── Port cache ───────────────────────────────────────────────────────────────

/** Upsert airport data into port_cache (replaces stale rows). */
export async function upsertPortCache(ports: PortEntry[]) {
  if (ports.length === 0) return;
  await db
    .insert(portCache)
    .values(
      ports.map((p) => ({
        iataCode: p.iataCode,
        name: p.name,
        city: p.city ?? null,
        country: p.country ?? null,
        updatedAt: new Date(),
      }))
    )
    .onConflictDoUpdate({
      target: portCache.iataCode,
      set: {
        name: sql`excluded.name`,
        city: sql`excluded.city`,
        country: sql`excluded.country`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

/** Search port_cache by IATA code, city, or name (case-insensitive). */
export async function searchPortCache(q: string) {
  return db
    .select()
    .from(portCache)
    .where(
      or(
        ilike(portCache.iataCode, `${q}%`),
        ilike(portCache.city, `%${q}%`),
        ilike(portCache.name, `%${q}%`)
      )
    )
    .limit(20)
    .orderBy(portCache.iataCode);
}

/** Returns true if the port cache is empty or older than 24 hours. */
export async function isPortCacheStale(): Promise<boolean> {
  const rows = await db.execute<{ updated_at: string }>(sql`
    SELECT updated_at
    FROM port_cache
    ORDER BY updated_at DESC
    LIMIT 1
  `);
  if (rows.rows.length === 0) return true;
  const age = Date.now() - new Date(rows.rows[0].updated_at).getTime();
  return age > 24 * 60 * 60 * 1000;
}
