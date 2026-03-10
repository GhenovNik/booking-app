import type { CommandContext } from "grammy";
import type { BotContext } from "../types";
import { getWatch, updateWatch } from "@/lib/db/queries";

export async function resumeCommand(ctx: CommandContext<BotContext>) {
  const id = Number(ctx.match);
  if (!id) {
    await ctx.reply("Usage: /resume <id>");
    return;
  }

  const watch = await getWatch(id);
  if (!watch) {
    await ctx.reply(`Watch #${id} not found.`);
    return;
  }

  if (watch.isActive) {
    await ctx.reply(`Watch #${id} is already active.`);
    return;
  }

  await updateWatch(id, { isActive: true });
  await ctx.reply(`▶️ Watch #${id} *${watch.name}* resumed.`, {
    parse_mode: "Markdown",
  });
}
