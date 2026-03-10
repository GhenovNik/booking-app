import type { CommandContext } from "grammy";
import type { BotContext } from "../types";
import { getWatch } from "@/lib/db/queries";

export async function checkCommand(ctx: CommandContext<BotContext>) {
  const id = Number(ctx.match);
  if (!id) {
    await ctx.reply("Usage: /check <id>");
    return;
  }

  const watch = await getWatch(id);
  if (!watch) {
    await ctx.reply(`Watch #${id} not found.`);
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET ?? "";

  try {
    const res = await fetch(`${appUrl}/api/cron/fetch/${id}`, {
      method: "POST",
      headers: { "x-cron-secret": cronSecret },
    });

    if (res.ok) {
      await ctx.reply(`🔍 Triggered price check for *${watch.name}*...`, {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply(`⚠️ Check failed: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    await ctx.reply(`⚠️ Could not reach app: ${String(err)}`);
  }
}
