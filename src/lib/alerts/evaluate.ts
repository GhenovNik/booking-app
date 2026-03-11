import type { AlertRule, PriceSnapshot } from "@/lib/db/schema";

export interface TriggeredAlert {
  rule: AlertRule;
  snapshot: PriceSnapshot;
  /** Human-readable reason, e.g. "↓ $52 ($348 from baseline $400)" */
  reason: string;
}

/**
 * Evaluate alert rules against a fresh price snapshot.
 * Pure function — no DB or network calls.
 *
 * Rule type "min_drop": triggers when (baseline - price) >= rule.value.
 * If rule.value === 0, triggers on any price drop from baseline.
 * Baseline = oldest known snapshot price for this watch.
 */
export function evaluateRules(
  rules: AlertRule[],
  snapshot: PriceSnapshot,
  /** Oldest known price for this watch (first snapshot) */
  baseline: number | null
): TriggeredAlert[] {
  const price = Number(snapshot.price);
  const triggered: TriggeredAlert[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (rule.type !== "min_drop") continue;
    if (baseline === null) continue; // first check — just saving baseline, no alert yet

    const minDrop = Number(rule.value);
    const drop = baseline - price;

    if (drop >= minDrop) {
      const dropStr = drop.toFixed(0);
      const reason =
        minDrop === 0
          ? `↓ $${dropStr} ($${price.toFixed(0)} from baseline $${baseline.toFixed(0)})`
          : `↓ $${dropStr} ($${price.toFixed(0)} from baseline $${baseline.toFixed(0)}, threshold $${minDrop.toFixed(0)})`;
      triggered.push({ rule, snapshot, reason });
    }
  }

  return triggered;
}
