import type { CommandContext } from "grammy";
import type { BotContext } from "../types";
import { getWatch } from "@/lib/db/queries";

export async function alertsCommand(ctx: CommandContext<BotContext>) {
  const id = Number(ctx.match);
  if (!id) {
    await ctx.reply("Использование: /alerts <id>\n\nИли используй /watches для просмотра отслеживаний.");
    return;
  }

  const watch = await getWatch(id);
  if (!watch) {
    await ctx.reply(`Отслеживание #${id} не найдено.`);
    return;
  }

  const rules = watch.alertRules;

  if (rules.length === 0) {
    await ctx.reply(
      `У *${watch.name}* нет правил уведомлений.\nПересоздай отслеживание через /add.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const lines = rules.map((r) => {
    const status = r.isActive ? "🟢" : "⏸️";
    const drop = Number(r.value);
    const dropText = drop === 0 ? "на любую сумму" : `на $${drop} и больше`;
    return `${status} [${r.id}] Уведомить когда цена упадёт ${dropText} от первой зафиксированной`;
  });

  await ctx.reply(
    `🔔 Правила уведомлений для *${watch.name}*:\n\n${lines.join("\n")}`,
    { parse_mode: "Markdown" }
  );
}
