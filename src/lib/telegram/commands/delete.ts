import type { CommandContext } from "grammy";
import type { BotContext } from "../types";
import { getWatch, deleteWatch } from "@/lib/db/queries";
import { InlineKeyboard } from "grammy";

export async function deleteCommand(ctx: CommandContext<BotContext>) {
  const id = Number(ctx.match);
  if (!id) {
    await ctx.reply("Usage: /delete <id>");
    return;
  }

  const watch = await getWatch(id);
  if (!watch) {
    await ctx.reply(`Watch #${id} not found.`);
    return;
  }

  const kb = new InlineKeyboard()
    .text("Yes, delete", `delete_confirm:${id}`)
    .text("Cancel", `delete_cancel:${id}`);

  await ctx.reply(
    `Delete watch #${id} *${watch.name}*?\nThis will remove all price history too.`,
    { parse_mode: "Markdown", reply_markup: kb }
  );
}

// Handle confirmation callbacks — registered in bot via callbackQuery
export async function handleDeleteCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data ?? "";
  const [action, idStr] = data.split(":");
  const id = Number(idStr);

  await ctx.answerCallbackQuery();

  if (action === "delete_confirm") {
    const watch = await getWatch(id);
    const name = watch?.name ?? `#${id}`;
    await deleteWatch(id);
    await ctx.editMessageText(`🗑️ Watch *${name}* deleted.`, {
      parse_mode: "Markdown",
    });
  } else {
    await ctx.editMessageText("Cancelled.");
  }
}
