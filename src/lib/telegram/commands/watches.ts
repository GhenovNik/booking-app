import type { CommandContext } from "grammy";
import { InlineKeyboard } from "grammy";
import type { BotContext } from "../types";
import { listWatches, getWatch, updateWatch, deleteWatch } from "@/lib/db/queries";

export async function watchesCommand(ctx: CommandContext<BotContext>) {
  const watches = await listWatches();

  if (watches.length === 0) {
    await ctx.reply("Нет активных отслеживаний. Используй /add чтобы создать.");
    return;
  }

  for (const w of watches) {
    const status = w.isActive ? "🟢 Активно" : "⏸️ На паузе";
    const route = `${w.origin} → ${w.destination}`;
    const checked = w.lastCheckedAt
      ? `проверено ${timeAgo(new Date(w.lastCheckedAt))}`
      : "ещё не проверялось";
    const mode =
      w.mode === "fixed"
        ? `📅 ${w.depDate}${w.retDate ? ` → ${w.retDate}` : ""}`
        : `🗓 Гибкий диапазон`;

    const text =
      `${status} | *${w.name}*\n` +
      `✈️ ${route} | ${mode}\n` +
      `🕐 ${checked}`;

    const kb = new InlineKeyboard();
    if (w.isActive) {
      kb.text("⏸ Пауза", `wa_pause:${w.id}`);
    } else {
      kb.text("▶️ Возобновить", `wa_resume:${w.id}`);
    }
    kb.text("🔍 Проверить", `wa_check:${w.id}`)
      .text("🗑 Удалить", `wa_delete:${w.id}`);

    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
  }
}

// ── Inline button handlers ────────────────────────────────────────────────────

export async function handleWatchAction(ctx: BotContext) {
  const data = ctx.callbackQuery?.data ?? "";
  const colonIdx = data.indexOf(":");
  const action = data.slice(0, colonIdx);
  const id = Number(data.slice(colonIdx + 1));

  await ctx.answerCallbackQuery();

  if (action === "wa_pause") {
    const watch = await getWatch(id);
    if (!watch) { await ctx.reply(`Watch #${id} не найден.`); return; }
    if (!watch.isActive) { await ctx.editMessageText(`⏸️ *${watch.name}* уже на паузе.`, { parse_mode: "Markdown" }); return; }
    await updateWatch(id, { isActive: false });
    await ctx.editMessageText(`⏸️ *${watch.name}* приостановлено.`, { parse_mode: "Markdown" });

  } else if (action === "wa_resume") {
    const watch = await getWatch(id);
    if (!watch) { await ctx.reply(`Watch #${id} не найден.`); return; }
    if (watch.isActive) { await ctx.editMessageText(`▶️ *${watch.name}* уже активно.`, { parse_mode: "Markdown" }); return; }
    await updateWatch(id, { isActive: true });
    await ctx.editMessageText(`▶️ *${watch.name}* возобновлено.`, { parse_mode: "Markdown" });

  } else if (action === "wa_check") {
    const watch = await getWatch(id);
    if (!watch) { await ctx.reply(`Watch #${id} не найден.`); return; }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const cronSecret = process.env.CRON_SECRET ?? "";
    try {
      const res = await fetch(`${appUrl}/api/cron/fetch/${id}`, {
        method: "POST",
        headers: { "x-cron-secret": cronSecret },
      });
      if (res.ok) {
        await ctx.reply(`🔍 Запущена проверка цены для *${watch.name}*...`, { parse_mode: "Markdown" });
      } else {
        await ctx.reply(`⚠️ Ошибка проверки: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      await ctx.reply(`⚠️ Не удалось достучаться до приложения: ${String(err)}`);
    }

  } else if (action === "wa_delete") {
    const watch = await getWatch(id);
    if (!watch) { await ctx.reply(`Watch #${id} не найден.`); return; }
    const kb = new InlineKeyboard()
      .text("✅ Да, удалить", `wa_delete_confirm:${id}`)
      .text("❌ Отмена", `wa_delete_cancel:${id}`);
    await ctx.editMessageText(
      `Удалить *${watch.name}*?\nВся история цен тоже удалится.`,
      { parse_mode: "Markdown", reply_markup: kb }
    );

  } else if (action === "wa_delete_confirm") {
    const watch = await getWatch(id);
    const name = watch?.name ?? `#${id}`;
    await deleteWatch(id);
    await ctx.editMessageText(`🗑️ *${name}* удалено.`, { parse_mode: "Markdown" });

  } else if (action === "wa_delete_cancel") {
    await ctx.editMessageText("Отменено.");
  }
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "только что";
  if (secs < 3600) return `${Math.floor(secs / 60)} мин назад`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} ч назад`;
  return `${Math.floor(secs / 86400)} дн назад`;
}
