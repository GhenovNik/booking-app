import type { CommandContext } from "grammy";
import type { BotContext } from "../types";
import { listWatches } from "@/lib/db/queries";

export async function listCommand(ctx: CommandContext<BotContext>) {
  const watches = await listWatches();

  if (watches.length === 0) {
    await ctx.reply("No watches yet. Use /new to create one.");
    return;
  }

  const lines = watches.map((w) => {
    const status = w.isActive ? "🟢" : "⏸️";
    const route = `${w.origin}→${w.destination}`;
    const checked = w.lastCheckedAt
      ? `checked ${timeAgo(new Date(w.lastCheckedAt))}`
      : "never checked";
    const mode = w.mode === "fixed" ? `📅 ${w.depDate}` : `📅 flexible`;
    return `${status} *[${w.id}]* ${w.name}\n  ${route} | ${mode} | ${checked}`;
  });

  await ctx.reply(lines.join("\n\n"), { parse_mode: "Markdown" });
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
