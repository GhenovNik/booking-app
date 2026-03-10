import type { Conversation } from "@grammyjs/conversations";
import { InlineKeyboard } from "grammy";
import type { BotContext } from "./types";
import { createWatch, createAlertRule } from "@/lib/db/queries";

type Conv = Conversation<BotContext>;

const IATA_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function askText(
  conv: Conv,
  ctx: BotContext,
  prompt: string,
  validate?: (v: string) => string | null
): Promise<string> {
  while (true) {
    await ctx.reply(prompt);
    const msg = await conv.waitFor("message:text");
    const value = msg.message.text.trim().toUpperCase();
    if (validate) {
      const err = validate(value);
      if (err) {
        await ctx.reply(`❌ ${err}. Try again:`);
        continue;
      }
    }
    return value;
  }
}

async function askOptional(
  conv: Conv,
  ctx: BotContext,
  prompt: string
): Promise<string | null> {
  await ctx.reply(prompt + " (or send — to skip)");
  const msg = await conv.waitFor("message:text");
  const v = msg.message.text.trim();
  return v === "—" || v === "-" ? null : v;
}

export async function newWatchConversation(conv: Conv, ctx: BotContext) {
  await ctx.reply("Let's create a new price watch. Type /cancel at any time to stop.\n");

  // ── Name ──────────────────────────────────────────────────────────────────
  await ctx.reply("What's a name for this watch? (e.g. IST→AMS May)");
  const nameMsg = await conv.waitFor("message:text");
  const name = nameMsg.message.text.trim();
  if (name.toLowerCase() === "/cancel") { await ctx.reply("Cancelled."); return; }

  // ── Origin ────────────────────────────────────────────────────────────────
  const origin = await askText(conv, ctx, "Origin airport (IATA, e.g. IST):", (v) =>
    IATA_RE.test(v) ? null : "Must be 3 capital letters"
  );
  if (origin === "/CANCEL") { await ctx.reply("Cancelled."); return; }

  // ── Destination ───────────────────────────────────────────────────────────
  const dest = await askText(conv, ctx, "Destination airport (IATA, e.g. AMS):", (v) => {
    if (!IATA_RE.test(v)) return "Must be 3 capital letters";
    if (v === origin) return "Same as origin";
    return null;
  });
  if (dest === "/CANCEL") { await ctx.reply("Cancelled."); return; }

  // ── Mode ──────────────────────────────────────────────────────────────────
  const modeKb = new InlineKeyboard()
    .text("📅 Fixed dates", "mode:fixed")
    .text("🗓️ Flexible range", "mode:flexible");

  await ctx.reply("Search mode?", { reply_markup: modeKb });
  const modeCtx = await conv.waitFor("callback_query:data");
  await modeCtx.answerCallbackQuery();
  const mode = modeCtx.callbackQuery.data.split(":")[1] as "fixed" | "flexible";

  // ── Dates ─────────────────────────────────────────────────────────────────
  let depDate: string | null = null;
  let retDate: string | null = null;
  let depFrom: string | null = null;
  let depTo: string | null = null;
  let retFrom: string | null = null;
  let retTo: string | null = null;

  if (mode === "fixed") {
    depDate = await askText(conv, ctx, "Departure date (YYYY-MM-DD):", (v) =>
      DATE_RE.test(v) ? null : "Format must be YYYY-MM-DD"
    );
    if (depDate === "/CANCEL") { await ctx.reply("Cancelled."); return; }

    const retInput = await askOptional(conv, ctx, "Return date (YYYY-MM-DD)?");
    if (retInput && !DATE_RE.test(retInput)) {
      await ctx.reply("Invalid date, skipping return date.");
    } else {
      retDate = retInput;
    }
  } else {
    depFrom = await askText(conv, ctx, "Departure window — FROM (YYYY-MM-DD):", (v) =>
      DATE_RE.test(v) ? null : "Format must be YYYY-MM-DD"
    );
    if (depFrom === "/CANCEL") { await ctx.reply("Cancelled."); return; }

    depTo = await askText(conv, ctx, "Departure window — TO (YYYY-MM-DD):", (v) =>
      DATE_RE.test(v) ? null : "Format must be YYYY-MM-DD"
    );

    const retFromInput = await askOptional(conv, ctx, "Return window — FROM (YYYY-MM-DD)?");
    retFrom = retFromInput && DATE_RE.test(retFromInput) ? retFromInput : null;

    if (retFrom) {
      const retToInput = await askOptional(conv, ctx, "Return window — TO (YYYY-MM-DD)?");
      retTo = retToInput && DATE_RE.test(retToInput) ? retToInput : null;
    }
  }

  // ── Cabin ─────────────────────────────────────────────────────────────────
  const cabinKb = new InlineKeyboard()
    .text("Economy", "cabin:ECONOMY")
    .text("Business", "cabin:BUSINESS")
    .text("First", "cabin:FIRST");

  await ctx.reply("Cabin class?", { reply_markup: cabinKb });
  const cabinCtx = await conv.waitFor("callback_query:data");
  await cabinCtx.answerCallbackQuery();
  const cabin = cabinCtx.callbackQuery.data.split(":")[1] as
    | "ECONOMY"
    | "BUSINESS"
    | "FIRST";

  // ── Alert price ───────────────────────────────────────────────────────────
  const alertInput = await askOptional(
    conv,
    ctx,
    "Max price alert in EUR? (e.g. 200)"
  );
  const alertPrice = alertInput ? Number(alertInput) : null;

  // ── Confirm ───────────────────────────────────────────────────────────────
  const summary =
    `📋 *Confirm watch:*\n\n` +
    `Name: ${name}\n` +
    `Route: ${origin} → ${dest}\n` +
    `Mode: ${mode === "fixed" ? `Fixed (${depDate}${retDate ? ` → ${retDate}` : ""})` : `Flexible (${depFrom}–${depTo}${retFrom ? ` / ${retFrom}–${retTo}` : ""})`}\n` +
    `Cabin: ${cabin}\n` +
    (alertPrice ? `Alert: ≤ EUR ${alertPrice}\n` : "Alert: none\n");

  const confirmKb = new InlineKeyboard()
    .text("✅ Create", "confirm:yes")
    .text("❌ Cancel", "confirm:no");

  await ctx.reply(summary, { parse_mode: "Markdown", reply_markup: confirmKb });
  const confirmCtx = await conv.waitFor("callback_query:data");
  await confirmCtx.answerCallbackQuery();

  if (confirmCtx.callbackQuery.data === "confirm:no") {
    await ctx.reply("Cancelled.");
    return;
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const watch = await createWatch({
    name,
    origin,
    destination: dest,
    mode,
    pax: 1,
    cabin,
    fetchIntervalH: 12,
    ...(mode === "fixed"
      ? { depDate, retDate }
      : { depFrom, depTo, retFrom, retTo }),
  });

  if (alertPrice && !isNaN(alertPrice) && alertPrice > 0) {
    await createAlertRule({
      watchId: watch.id,
      type: "absolute_max",
      value: String(alertPrice),
      currency: "EUR",
    });
  }

  await ctx.reply(
    `✅ Watch *#${watch.id} ${name}* created!\n\nI'll check prices every 12 hours. Use /check ${watch.id} to trigger a check now.`,
    { parse_mode: "Markdown" }
  );
}
