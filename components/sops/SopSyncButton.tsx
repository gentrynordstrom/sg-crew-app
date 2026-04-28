"use client";

import { useState } from "react";

interface SyncResult {
  created: number;
  updated: number;
  archived: number;
  errors: string[];
}

export function SopSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSync() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/sops/sync-notion", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sync failed.");
        return;
      }
      setResult(data as SyncResult);
    } catch {
      setError("Network error while running sync.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={runSync}
        disabled={loading}
        className="rounded-full bg-brand-brass-400 px-5 py-2 text-sm font-semibold text-brand-moss-800 disabled:opacity-60"
      >
        {loading ? "Syncing…" : "Sync SOPs from Notion"}
      </button>

      {result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200">
          Created {result.created}, updated {result.updated}, archived {result.archived}
          {result.errors.length > 0 && (
            <div className="mt-2 space-y-1 text-xs text-red-300">
              {result.errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
