import {
  pgTable,
  serial,
  text,
  char,
  pgEnum,
  date,
  smallint,
  integer,
  boolean,
  timestamp,
  bigserial,
  numeric,
  jsonb,
  bigint,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql as drizzleSql } from "drizzle-orm";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

// ─── Enums ───────────────────────────────────────────────────────────────────

export const watchModeEnum = pgEnum("watch_mode", ["fixed", "flexible"]);
export const cabinEnum = pgEnum("cabin", ["ECONOMY", "BUSINESS", "FIRST"]);
export const alertTypeEnum = pgEnum("alert_type", ["min_drop"]);

// ─── watches ─────────────────────────────────────────────────────────────────

export const watches = pgTable(
  "watches",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    origin: char("origin", { length: 3 }).notNull(),
    destination: char("destination", { length: 3 }).notNull(),
    mode: watchModeEnum("mode").notNull(),
    // Fixed mode
    depDate: date("dep_date"),
    retDate: date("ret_date"),
    // Flexible mode
    depFrom: date("dep_from"),
    depTo: date("dep_to"),
    retFrom: date("ret_from"),
    retTo: date("ret_to"),
    // Common
    pax: smallint("pax").default(1).notNull(),
    cabin: cabinEnum("cabin").default("ECONOMY").notNull(),
    fetchIntervalH: integer("fetch_interval_h").default(12).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastCheckedAt: timestamptz("last_checked_at"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
  },
  (t) => ({
    activeLastCheckedIdx: index("watches_active_last_checked_idx")
      .on(t.isActive, t.lastCheckedAt)
      .where(drizzleSql`${t.isActive} = true`),
  })
);

// ─── alert_rules ─────────────────────────────────────────────────────────────

export const alertRules = pgTable("alert_rules", {
  id: serial("id").primaryKey(),
  watchId: integer("watch_id")
    .notNull()
    .references(() => watches.id, { onDelete: "cascade" }),
  type: alertTypeEnum("type").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  currency: char("currency", { length: 3 }).default("USD").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// ─── price_snapshots ─────────────────────────────────────────────────────────

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    watchId: integer("watch_id")
      .notNull()
      .references(() => watches.id, { onDelete: "cascade" }),
    checkedAt: timestamptz("checked_at").defaultNow().notNull(),
    outboundDate: date("outbound_date").notNull(),
    inboundDate: date("inbound_date"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    isPromo: boolean("is_promo").default(false).notNull(),
    raw: jsonb("raw").notNull(),
  },
  (t) => ({
    watchDateCheckedIdx: index("price_snapshots_watch_date_idx").on(
      t.watchId,
      t.outboundDate,
      t.inboundDate,
      t.checkedAt
    ),
  })
);

// ─── notifications ───────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  watchId: integer("watch_id")
    .notNull()
    .references(() => watches.id),
  ruleId: integer("rule_id")
    .notNull()
    .references(() => alertRules.id),
  snapshotId: bigint("snapshot_id", { mode: "bigint" })
    .notNull()
    .references(() => priceSnapshots.id),
  sentAt: timestamptz("sent_at").defaultNow().notNull(),
  chatId: text("chat_id").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  messageId: text("message_id"),
});

// ─── port_cache ───────────────────────────────────────────────────────────────

export const portCache = pgTable("port_cache", {
  iataCode: char("iata_code", { length: 3 }).primaryKey(),
  name: text("name").notNull(),
  city: text("city"),
  country: char("country", { length: 2 }),
  updatedAt: timestamptz("updated_at").defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const watchesRelations = relations(watches, ({ many }) => ({
  alertRules: many(alertRules),
  priceSnapshots: many(priceSnapshots),
  notifications: many(notifications),
}));

export const alertRulesRelations = relations(alertRules, ({ one }) => ({
  watch: one(watches, { fields: [alertRules.watchId], references: [watches.id] }),
}));

export const priceSnapshotsRelations = relations(priceSnapshots, ({ one }) => ({
  watch: one(watches, { fields: [priceSnapshots.watchId], references: [watches.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  watch: one(watches, { fields: [notifications.watchId], references: [watches.id] }),
  rule: one(alertRules, { fields: [notifications.ruleId], references: [alertRules.id] }),
  snapshot: one(priceSnapshots, { fields: [notifications.snapshotId], references: [priceSnapshots.id] }),
}));

// ─── Types ───────────────────────────────────────────────────────────────────

export type Watch = typeof watches.$inferSelect;
export type NewWatch = typeof watches.$inferInsert;
export type AlertRule = typeof alertRules.$inferSelect;
export type NewAlertRule = typeof alertRules.$inferInsert;
export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type NewPriceSnapshot = typeof priceSnapshots.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type PortCache = typeof portCache.$inferSelect;
