import type { CommandContext } from "grammy";
import type { BotContext } from "../types";
import { getWatch, updateWatch } from "@/lib/db/queries";

export async function pauseCommand(ctx: CommandContext<BotContext>) {
  const id = Number(ctx.match);
  if (!id) {
    await ctx.reply("Использование: /pause <id>\n\nИли используй /watches и нажми ⏸ Пауза.");
    return;
  }

  const watch = await getWatch(id);
  if (!watch) {
    await ctx.reply(`Отслеживание #${id} не найдено.`);
    return;
  }

  if (!watch.isActive) {
    await ctx.reply(`Отслеживание #${id} уже на паузе.`);
    return;
  }

  await updateWatch(id, { isActive: false });
  await ctx.reply(`⏸️ *${watch.name}* приостановлено.`, {
    parse_mode: "Markdown",
  });
}
