"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Watch, AlertRule } from "@/lib/db/schema";

interface Props {
  watch: Watch & { alertRules: AlertRule[] };
}

export function WatchCard({ watch }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function patch(data: Record<string, unknown>) {
    await fetch(`/api/watches/${watch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
  }

  async function checkNow() {
    setLoading("check");
    try {
      const cronSecret = ""; // manual trigger via UI — relies on middleware allowing it
      await fetch(`/api/cron/fetch/${watch.id}`, {
        method: "POST",
        headers: { "x-cron-secret": cronSecret },
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function del() {
    if (!confirm(`Delete watch "${watch.name}"? This removes all price history.`)) return;
    setLoading("delete");
    try {
      await fetch(`/api/watches/${watch.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const dateRange = () => {
    if (watch.mode === "fixed") {
      const dep = watch.depDate ?? "?";
      return watch.retDate ? `${dep} → ${watch.retDate}` : `${dep} (one-way)`;
    }
    const dep = watch.depFrom && watch.depTo ? `${watch.depFrom}–${watch.depTo}` : "?";
    const ret = watch.retFrom ? `${watch.retFrom}–${watch.retTo ?? watch.retFrom}` : "one-way";
    return `${dep} / ${ret}`;
  };

  const rule = watch.alertRules[0];

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 ${watch.isActive ? "border-gray-800" : "border-gray-700 opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono font-bold text-blue-400">
              {watch.origin} → {watch.destination}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${watch.isActive ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"}`}>
              {watch.isActive ? "active" : "paused"}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{watch.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {watch.mode === "flexible" ? "Flexible · " : "Fixed · "}
            {dateRange()}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {watch.pax} pax · {watch.cabin} · every {watch.fetchIntervalH}h
            {rule ? ` · alert ≤ ${rule.currency} ${Number(rule.value).toFixed(0)}` : ""}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {watch.lastCheckedAt && (
            <span className="text-xs text-gray-600">
              {new Date(watch.lastCheckedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
        <button
          onClick={checkNow}
          disabled={!!loading}
          className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40 transition-colors"
        >
          {loading === "check" ? "Checking…" : "Check now"}
        </button>
        <span className="text-gray-700">·</span>
        <button
          onClick={() => patch({ isActive: !watch.isActive })}
          disabled={!!loading}
          className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40 transition-colors"
        >
          {watch.isActive ? "Pause" : "Resume"}
        </button>
        <span className="text-gray-700">·</span>
        <button
          onClick={del}
          disabled={!!loading}
          className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40 transition-colors"
        >
          {loading === "delete" ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
