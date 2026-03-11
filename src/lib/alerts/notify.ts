import type { Watch, PriceSnapshot } from "@/lib/db/schema";
import type { TriggeredAlert } from "./evaluate";
import { wasNotifiedRecently, insertNotification } from "@/lib/db/queries";
import { getBot } from "@/lib/telegram/bot";

const CHAT_IDS = () =>
  (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Send Telegram alerts for all triggered rules, with 24h dedup. */
export async function sendAlerts(
  watch: Watch,
  alerts: TriggeredAlert[]
): Promise<void> {
  const bot = getBot();
  const chatIds = CHAT_IDS();

  for (const { rule, snapshot, reason } of alerts) {
    const outbound = snapshot.outboundDate ?? "";
    const inbound = snapshot.inboundDate ?? null;

    // 24h dedup check
    const alreadySent = await wasNotifiedRecently(
      watch.id,
      rule.id,
      outbound,
      inbound
    );
    if (alreadySent) continue;

    const text = buildMessage(watch, snapshot, reason);

    for (const chatId of chatIds) {
      try {
        const sent = await bot.api.sendMessage(chatId, text, {
          parse_mode: "Markdown",
          link_preview_options: { is_disabled: true },
        });

        await insertNotification({
          watchId: watch.id,
          ruleId: rule.id,
          snapshotId: snapshot.id as bigint,
          chatId,
          price: snapshot.price,
          messageId: String(sent.message_id),
        });
      } catch (err) {
        console.error(`[notify] Failed to send to ${chatId}:`, err);
      }
    }
  }
}

function buildMessage(
  watch: Watch,
  snapshot: PriceSnapshot,
  reason: string
): string {
  const mode =
    watch.mode === "flexible" && watch.depFrom
      ? `Flexible (${watch.depFrom}–${watch.depTo})`
      : "Fixed";

  const dates =
    snapshot.inboundDate
      ? `${snapshot.outboundDate} → ${snapshot.inboundDate}`
      : snapshot.outboundDate ?? "";

  const promo = snapshot.isPromo ? " 🔥 Best Deal" : "";

  return (
    `✈️ *${watch.origin} → ${watch.destination}* | ${mode}\n` +
    `📅 ${dates}\n` +
    `💰 ${snapshot.currency} ${Number(snapshot.price).toFixed(0)}${promo}\n` +
    `📊 ${reason}\n\n` +
    `Watch: _${watch.name}_`
  );
}
