import type { CommandContext } from "grammy";
import { InlineKeyboard } from "grammy";
import type { BotContext } from "../types";
import { getWatch, deleteWatch } from "@/lib/db/queries";

export async function removeCommand(ctx: CommandContext<BotContext>) {
  const id = Number(ctx.match);
  if (!id) {
    await ctx.reply("Использование: /remove <id>\n\nИли используй /watches и нажми кнопку 🗑 Удалить.");
    return;
  }

  const watch = await getWatch(id);
  if (!watch) {
    await ctx.reply(`Отслеживание #${id} не найдено.`);
    return;
  }

  const kb = new InlineKeyboard()
    .text("✅ Да, удалить", `wa_delete_confirm:${id}`)
    .text("❌ Отмена", `wa_delete_cancel:${id}`);

  await ctx.reply(
    `Удалить *${watch.name}*?\nВся история цен тоже удалится.`,
    { parse_mode: "Markdown", reply_markup: kb }
  );
}
