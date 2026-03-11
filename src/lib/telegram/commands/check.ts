import type { CommandContext } from "grammy";
import type { BotContext } from "../types";
import { getWatch } from "@/lib/db/queries";

export async function checkCommand(ctx: CommandContext<BotContext>) {
  const id = Number(ctx.match);
  if (!id) {
    await ctx.reply("Использование: /check <id>\n\nИли используй /watches и нажми 🔍 Проверить.");
    return;
  }

  const watch = await getWatch(id);
  if (!watch) {
    await ctx.reply(`Отслеживание #${id} не найдено.`);
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
      await ctx.reply(`🔍 Запущена проверка цены для *${watch.name}*...`, {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply(`⚠️ Ошибка проверки: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    await ctx.reply(`⚠️ Не удалось достучаться до приложения: ${String(err)}`);
  }
}
