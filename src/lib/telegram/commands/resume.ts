import type { CommandContext } from "grammy";
import type { BotContext } from "../types";
import { getWatch, updateWatch } from "@/lib/db/queries";

export async function resumeCommand(ctx: CommandContext<BotContext>) {
  const id = Number(ctx.match);
  if (!id) {
    await ctx.reply("Использование: /resume <id>\n\nИли используй /watches и нажми ▶️ Возобновить.");
    return;
  }

  const watch = await getWatch(id);
  if (!watch) {
    await ctx.reply(`Отслеживание #${id} не найдено.`);
    return;
  }

  if (watch.isActive) {
    await ctx.reply(`Отслеживание #${id} уже активно.`);
    return;
  }

  await updateWatch(id, { isActive: true });
  await ctx.reply(`▶️ *${watch.name}* возобновлено.`, {
    parse_mode: "Markdown",
  });
}
