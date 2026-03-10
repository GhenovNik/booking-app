import type { CommandContext } from "grammy";
import type { BotContext } from "../types";
import { db } from "@/lib/db";
import { watches } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function statusCommand(ctx: CommandContext<BotContext>) {
  try {
    const [{ total, active }] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`sum(case when is_active then 1 else 0 end)::int`,
      })
      .from(watches);

    const [{ snapshots }] = await db.execute<{ snapshots: number }>(
      sql`SELECT count(*)::int AS snapshots FROM price_snapshots`
    );

    await ctx.reply(
      `🖥️ *System Status*\n\n` +
        `DB: ✅ connected\n` +
        `Watches: ${active} active / ${total} total\n` +
        `Price snapshots: ${snapshots}\n` +
        `Bot: ✅ running`,
      { parse_mode: "Markdown" }
    );
  } catch {
    await ctx.reply("⚠️ DB connection error — check logs.");
  }
}
