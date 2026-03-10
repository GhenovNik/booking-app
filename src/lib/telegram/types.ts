import type { Context, SessionFlavor } from "grammy";
import type { ConversationFlavor } from "@grammyjs/conversations";

export interface SessionData {
  step: string | null;
  draft: Record<string, unknown>;
}

export type BotContext = Context &
  SessionFlavor<SessionData> &
  ConversationFlavor;
