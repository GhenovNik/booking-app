import type { CommandContext } from "grammy";
import type { BotContext } from "../types";
import { getWatch, getPriceHistory } from "@/lib/db/queries";

export async function historyCommand(ctx: CommandContext<BotContext>) {
  const id = Number(ctx.match);
  if (!id) {
    await ctx.reply("Usage: /history <id>");
    return;
  }

  const watch = await getWatch(id);
  if (!watch) {
    await ctx.reply(`Watch #${id} not found.`);
    return;
  }

  const rows = await getPriceHistory(id);
  const history = rows.rows as Array<{
    day: string;
    min_price: string;
    currency: string;
  }>;

  if (history.length === 0) {
    await ctx.reply(
      `No price data yet for *${watch.name}*. Run /check ${id} to fetch.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const lines = history
    .slice(-14) // last 14 days
    .map((r) => `  ${r.day.slice(0, 10)}  ${r.currency} ${Number(r.min_price).toFixed(0)}`);

  const prices = history.map((r) => Number(r.min_price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const lastPrice = prices[prices.length - 1];
  const currency = history[history.length - 1].currency;

  await ctx.reply(
    `📊 *${watch.name}* — price history (last ${lines.length} days)\n\n` +
      `\`\`\`\n${lines.join("\n")}\n\`\`\`\n\n` +
      `Min: ${currency} ${minPrice.toFixed(0)} | Max: ${currency} ${maxPrice.toFixed(0)} | Latest: ${currency} ${lastPrice.toFixed(0)}`,
    { parse_mode: "Markdown" }
  );
}
