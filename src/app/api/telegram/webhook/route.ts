import { NextRequest, NextResponse } from "next/server";
import { webhookCallback } from "grammy";
import { getBot } from "@/lib/telegram/bot";

// Grammy webhook handler for Next.js App Router
const handleUpdate = webhookCallback(getBot(), "std/http");

export async function POST(req: NextRequest) {
  // Validate Telegram webhook secret token
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (
    process.env.TELEGRAM_WEBHOOK_SECRET &&
    secret !== process.env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return handleUpdate(req);
}
