import type { CommandContext } from "grammy";
import type { BotContext } from "../types";

export async function startCommand(ctx: CommandContext<BotContext>) {
  await ctx.reply(
    `✈️ *FareTicketHunter*\n\nI monitor Turkish Airlines prices and alert you when they drop.\n\n` +
      `*Commands:*\n` +
      `/new — create a new price watch\n` +
      `/list — show all your watches\n` +
      `/status — system health\n` +
      `/pause <id> — pause a watch\n` +
      `/resume <id> — resume a watch\n` +
      `/check <id> — trigger immediate price check\n` +
      `/rules <id> — view alert rules\n` +
      `/history <id> — price history summary\n` +
      `/delete <id> — delete a watch`,
    { parse_mode: "Markdown" }
  );
}
