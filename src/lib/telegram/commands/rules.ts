import type { CommandContext } from "grammy";
import type { BotContext } from "../types";
import { getWatch } from "@/lib/db/queries";

export async function rulesCommand(ctx: CommandContext<BotContext>) {
  const id = Number(ctx.match);
  if (!id) {
    await ctx.reply("Usage: /rules <id>");
    return;
  }

  const watch = await getWatch(id);
  if (!watch) {
    await ctx.reply(`Watch #${id} not found.`);
    return;
  }

  const rules = watch.alertRules;

  if (rules.length === 0) {
    await ctx.reply(
      `Watch *${watch.name}* has no alert rules.\nCreate one via the web UI or /new.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const lines = rules.map((r) => {
    const status = r.isActive ? "🟢" : "⏸️";
    if (r.type === "absolute_max") {
      return `${status} [${r.id}] Alert when price ≤ ${r.currency} ${r.value}`;
    } else {
      return `${status} [${r.id}] Alert on ≥${r.value}% drop from baseline (${r.currency})`;
    }
  });

  await ctx.reply(
    `📋 Rules for *${watch.name}*:\n\n${lines.join("\n")}`,
    { parse_mode: "Markdown" }
  );
}
