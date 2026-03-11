import { Bot, session } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import type { BotContext, SessionData } from "./types";
import { newWatchConversation } from "./new-watch";

// ─── Bot singleton ────────────────────────────────────────────────────────────
// Next.js hot-reload guard
const globalForBot = globalThis as unknown as { tgBot?: Bot<BotContext> };

function makeBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  const bot = new Bot<BotContext>(token);

  // Sessions (in-memory — sufficient for personal Docker use)
  bot.use(
    session<SessionData, BotContext>({
      initial: (): SessionData => ({ step: null, draft: {} }),
    })
  );

  // Grammy conversations
  bot.use(conversations());
  bot.use(createConversation(newWatchConversation, "new-watch"));

  // Auth guard — only allowed chat IDs
  bot.use(async (ctx, next) => {
    const allowed = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (
      allowed.length > 0 &&
      !allowed.includes(String(ctx.chat?.id ?? ""))
    ) {
      await ctx.reply("Access denied.");
      return;
    }
    return next();
  });

  return bot;
}

export function getBot(): Bot<BotContext> {
  if (!globalForBot.tgBot) {
    globalForBot.tgBot = makeBot();
    registerCommands(globalForBot.tgBot);
  }
  return globalForBot.tgBot;
}

function registerCommands(bot: Bot<BotContext>) {
  // Lazy import to avoid circular deps
  const { startCommand } = require("./commands/start");
  const { watchesCommand, handleWatchAction } = require("./commands/watches");
  const { statusCommand } = require("./commands/status");
  const { pauseCommand } = require("./commands/pause");
  const { resumeCommand } = require("./commands/resume");
  const { removeCommand } = require("./commands/remove");
  const { checkCommand } = require("./commands/check");
  const { historyCommand } = require("./commands/history");
  const { alertsCommand } = require("./commands/alerts");

  bot.command("start", startCommand);
  bot.command("watches", watchesCommand);
  bot.command("status", statusCommand);
  bot.command("pause", pauseCommand);
  bot.command("resume", resumeCommand);
  bot.command("remove", removeCommand);
  bot.command("check", checkCommand);
  bot.command("history", historyCommand);
  bot.command("alerts", alertsCommand);
  bot.command("add", async (ctx) => {
    await ctx.conversation.enter("new-watch");
  });

  // Watch action buttons (from /watches list)
  bot.callbackQuery(/^wa_/, handleWatchAction);
}
