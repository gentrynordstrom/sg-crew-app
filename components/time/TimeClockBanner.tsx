"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDurationHms } from "@/lib/time";

interface ShiftSnapshot {
  id: string;
  clockInAt: string; // ISO
  breakStartAt: string | null;
  breakEndAt: string | null;
}

interface TimeClockBannerProps {
  activeShift: ShiftSnapshot | null;
}

export function TimeClockBanner({ activeShift }: TimeClockBannerProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!activeShift) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeShift]);

  if (!activeShift) {
    return (
      <Link
        href="/time"
        className="mb-6 flex items-center justify-between rounded-2xl border border-brand-cream-900/30 bg-brand-moss-800/40 px-4 py-3 transition hover:border-brand-brass-400/40 hover:bg-brand-moss-800/60"
      >
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-cream-600/50 ring-2 ring-brand-cream-700/30" />
          <span className="text-sm font-medium text-brand-cream-400">Not clocked in</span>
        </div>
        <span className="text-xs font-semibold text-brand-brass-400">Clock In →</span>
      </Link>
    );
  }

  const onBreak = activeShift.breakStartAt && !activeShift.breakEndAt;
  const inMs = new Date(activeShift.clockInAt).getTime();

  let elapsed: string;
  let statusLabel: string;

  if (onBreak && activeShift.breakStartAt) {
    const bStart = new Date(activeShift.breakStartAt).getTime();
    elapsed = formatDurationHms(now - bStart);
    statusLabel = "On Break";
  } else {
    let breakMs = 0;
    if (activeShift.breakStartAt && activeShift.breakEndAt) {
      breakMs =
        new Date(activeShift.breakEndAt).getTime() -
        new Date(activeShift.breakStartAt).getTime();
    }
    elapsed = formatDurationHms(now - inMs - breakMs);
    statusLabel = "Clocked In";
  }

  const clockedInAt = new Date(activeShift.clockInAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });

  const dotColor = onBreak
    ? "bg-amber-400 ring-amber-400/30"
    : "bg-emerald-400 ring-emerald-400/30 animate-pulse";

  const borderColor = onBreak
    ? "border-amber-600/30 bg-amber-900/10 hover:border-amber-500/40"
    : "border-emerald-700/30 bg-emerald-900/10 hover:border-emerald-600/40";

  return (
    <Link
      href="/time"
      className={`mb-6 flex items-center justify-between rounded-2xl border px-4 py-3 transition ${borderColor}`}
    >
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ${dotColor}`} />
        <div>
          <p className="text-sm font-semibold text-brand-cream-100">{statusLabel}</p>
          <p className="text-xs text-brand-cream-500">Since {clockedInAt}</p>
        </div>
      </div>

      <div className="text-right">
        <p
          className="font-mono text-xl font-semibold tabular-nums text-brand-cream-100"
          suppressHydrationWarning
        >
          {elapsed}
        </p>
        <p className="text-xs text-brand-cream-500">Tap to manage →</p>
      </div>
    </Link>
  );
}
