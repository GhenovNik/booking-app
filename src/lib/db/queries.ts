import { db } from "./index";
import { watches, alertRules, priceSnapshots, notifications } from "./schema";
import { eq, desc, and, sql } from "drizzle-orm";
import type { NewWatch, NewAlertRule, NewPriceSnapshot } from "./schema";

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
