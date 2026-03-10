import type { AlertRule, PriceSnapshot } from "@/lib/db/schema";

export interface TriggeredAlert {
  rule: AlertRule;
  snapshot: PriceSnapshot;
  /** Human-readable reason, e.g. "€189 ≤ €200" */
  reason: string;
}

/**
 * Evaluate alert rules against a fresh price snapshot.
 * Pure function — no DB or network calls.
 */
export function evaluateRules(
  rules: AlertRule[],
  snapshot: PriceSnapshot,
  /** Current baseline (oldest known price) for percent_drop rules */
  baseline: number | null
): TriggeredAlert[] {
  const price = Number(snapshot.price);
  const triggered: TriggeredAlert[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;

    const threshold = Number(rule.value);

    if (rule.type === "absolute_max") {
      if (price <= threshold) {
        triggered.push({
          rule,
          snapshot,
          reason: `${rule.currency} ${price.toFixed(0)} ≤ ${rule.currency} ${threshold.toFixed(0)}`,
        });
      }
    } else if (rule.type === "percent_drop") {
      if (baseline === null) continue; // can't evaluate without baseline
      const dropPct = ((baseline - price) / baseline) * 100;
      if (dropPct >= threshold) {
        triggered.push({
          rule,
          snapshot,
          reason: `↓ ${dropPct.toFixed(1)}% (${rule.currency} ${price.toFixed(0)} from ${rule.currency} ${baseline.toFixed(0)})`,
        });
      }
    }
  }

  return triggered;
}
