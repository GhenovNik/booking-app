import type { CommandContext } from "grammy";
import type { BotContext } from "../types";

export async function startCommand(ctx: CommandContext<BotContext>) {
  await ctx.reply(
    `✈️ *FareTicketHunter*\n\nОтслеживаю цены Turkish Airlines и сообщаю когда они падают.\n\n` +
      `*Команды:*\n` +
      `/add — добавить новое отслеживание\n` +
      `/watches — список всех отслеживаний (с кнопками управления)\n` +
      `/status — состояние системы\n` +
      `/check <id> — проверить цену прямо сейчас\n` +
      `/alerts <id> — правила уведомлений\n` +
      `/history <id> — история цен\n` +
      `/remove <id> — удалить отслеживание\n\n` +
      `💡 Совет: используй /watches — там можно паузить, возобновлять и удалять одной кнопкой, без ввода ID.`,
    { parse_mode: "Markdown" }
  );
}
