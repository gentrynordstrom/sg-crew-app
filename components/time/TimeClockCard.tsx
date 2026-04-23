"use client";

import { useEffect, useState, useTransition } from "react";
import { formatDurationHms } from "@/lib/time";
import {
  clockIn,
  clockOut,
  endBreak,
  startBreak,
  type ActionResult,
} from "@/app/time/actions";

interface ShiftSnapshot {
  id: string;
  clockInAt: string; // ISO
  breakStartAt: string | null;
  breakEndAt: string | null;
}

interface TimeClockCardProps {
  activeShift: ShiftSnapshot | null;
}

function phase(shift: ShiftSnapshot | null):
  | "idle"
  | "working"
  | "onBreak"
  | "afterBreak" {
  if (!shift) return "idle";
  if (shift.breakStartAt && !shift.breakEndAt) return "onBreak";
  if (shift.breakStartAt && shift.breakEndAt) return "afterBreak";
  return "working";
}

export function TimeClockCard({ activeShift }: TimeClockCardProps) {
  const [now, setNow] = useState<number>(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const p = phase(activeShift);

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
    });
  }

  let bigTime = "00:00:00";
  let bigLabel = "Not clocked in";

  if (activeShift) {
    const inMs = new Date(activeShift.clockInAt).getTime();
    if (p === "onBreak" && activeShift.breakStartAt) {
      const bStart = new Date(activeShift.breakStartAt).getTime();
      bigTime = formatDurationHms(now - bStart);
      bigLabel = "On break";
    } else {
      // Working / afterBreak: total worked time = (now - clockIn) - completed break
      let breakMs = 0;
      if (activeShift.breakStartAt && activeShift.breakEndAt) {
        breakMs =
          new Date(activeShift.breakEndAt).getTime() -
          new Date(activeShift.breakStartAt).getTime();
      }
      bigTime = formatDurationHms(now - inMs - breakMs);
      bigLabel = p === "afterBreak" ? "Working (after break)" : "Working";
    }
  }

  return (
    <section className="rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-6 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cream-400">
          {bigLabel}
        </p>
        <p
          className="mt-2 font-mono text-5xl font-semibold tabular-nums text-brand-cream-100 sm:text-6xl"
          suppressHydrationWarning
        >
          {bigTime}
        </p>
        {activeShift && (
          <p
            className="mt-1 text-xs text-brand-cream-500"
            suppressHydrationWarning
          >
            Started{" "}
            {new Date(activeShift.clockInAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Chicago",
            })}
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-200 ring-1 ring-red-400/40"
        >
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {p === "idle" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(clockIn)}
            className="inline-flex min-h-touch min-w-[12rem] items-center justify-center rounded-full bg-brand-brass-400 px-8 py-3 text-lg font-semibold text-brand-moss-800 shadow-sm transition hover:bg-brand-brass-300 disabled:opacity-50"
          >
            {isPending ? "…" : "Clock In"}
          </button>
        )}

        {p === "working" && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(startBreak)}
              className="inline-flex min-h-touch items-center justify-center rounded-full border border-brand-moss-400/60 bg-brand-moss-700/60 px-6 py-3 text-base font-semibold text-brand-cream-100 transition hover:border-brand-brass-400/60 hover:text-brand-brass-200 disabled:opacity-50"
            >
              Start Break
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(clockOut)}
              className="inline-flex min-h-touch items-center justify-center rounded-full bg-brand-brass-400 px-6 py-3 text-base font-semibold text-brand-moss-800 shadow-sm transition hover:bg-brand-brass-300 disabled:opacity-50"
            >
              Clock Out
            </button>
          </>
        )}

        {p === "onBreak" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(endBreak)}
            className="inline-flex min-h-touch min-w-[12rem] items-center justify-center rounded-full bg-brand-brass-400 px-8 py-3 text-lg font-semibold text-brand-moss-800 shadow-sm transition hover:bg-brand-brass-300 disabled:opacity-50"
          >
            End Break
          </button>
        )}

        {p === "afterBreak" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(clockOut)}
            className="inline-flex min-h-touch min-w-[12rem] items-center justify-center rounded-full bg-brand-brass-400 px-8 py-3 text-lg font-semibold text-brand-moss-800 shadow-sm transition hover:bg-brand-brass-300 disabled:opacity-50"
          >
            Clock Out
          </button>
        )}
      </div>

      {p === "afterBreak" && (
        <p className="mt-3 text-center text-xs text-brand-cream-500">
          Break finished. One meal break per shift.
        </p>
      )}
    </section>
  );
}
