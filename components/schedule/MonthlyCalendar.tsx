"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ScheduledEvent,
  ScheduledEventType,
  ScheduledShift,
  User,
} from "@prisma/client";
import {
  EVENT_TYPE_COLORS,
  formatEventTime,
} from "@/lib/schedule";
import { publishWeek } from "@/app/admin/schedule/actions";

type EventWithCrew = ScheduledEvent & {
  shifts: (ScheduledShift & {
    user: Pick<User, "id" | "name" | "role">;
  })[];
};

interface MonthlyCalendarProps {
  /** 42 YYYY-MM-DD strings: the full Sun-start grid for the month */
  gridDays: string[];
  /** YYYY-MM-01 string for the displayed month */
  firstOfMonth: string;
  events: EventWithCrew[];
  hasDrafts: boolean;
  /** Monday strings for any weeks that have drafts, so we can target publish */
  draftMondays: string[];
}

const DOW_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthlyCalendar({
  gridDays,
  firstOfMonth,
  events,
  hasDrafts,
  draftMondays,
}: MonthlyCalendarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handlePublishAll() {
    if (
      !confirm(
        "Publish all draft events for this month? Crew members will be able to see them."
      )
    )
      return;
    // Publish each week that has drafts sequentially
    startTransition(async () => {
      for (const monday of draftMondays) {
        await publishWeek(monday);
      }
      router.refresh();
    });
  }

  // Index events by date string
  const byDay = new Map<string, EventWithCrew[]>();
  for (const day of gridDays) byDay.set(day, []);
  for (const ev of events) {
    const ymd = ev.date.toISOString().slice(0, 10);
    byDay.get(ymd)?.push(ev);
  }

  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = firstOfMonth.slice(0, 7); // "2026-04"

  return (
    <div>
      {hasDrafts && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-brand-brass-500/40 bg-brand-brass-900/20 px-4 py-3">
          <p className="text-sm text-brand-brass-200">
            This month has unpublished draft events.
          </p>
          <button
            onClick={handlePublishAll}
            disabled={isPending}
            className="ml-4 rounded-full bg-brand-brass-400 px-4 py-1.5 text-sm font-semibold text-brand-moss-800 transition hover:bg-brand-brass-300 disabled:opacity-50"
          >
            {isPending ? "Publishing…" : "Publish all drafts"}
          </button>
        </div>
      )}

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 gap-px">
        {DOW_HEADERS.map((h) => (
          <div
            key={h}
            className="py-1 text-center text-xs font-semibold text-brand-cream-500"
          >
            {h}
          </div>
        ))}
      </div>

      {/* 6-row grid */}
      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden bg-brand-moss-600/20">
        {gridDays.map((day) => {
          const isCurrentMonth = day.startsWith(monthPrefix);
          const isToday = day === today;
          const dayEvents = byDay.get(day) ?? [];
          const dayNum = parseInt(day.split("-")[2], 10);

          return (
            <div
              key={day}
              className={`min-h-[100px] p-1.5 ${
                isCurrentMonth
                  ? "bg-brand-moss-800/60"
                  : "bg-brand-moss-900/40"
              }`}
            >
              {/* Day number */}
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday
                      ? "bg-brand-brass-400 text-brand-moss-800"
                      : isCurrentMonth
                      ? "text-brand-cream-300"
                      : "text-brand-cream-700"
                  }`}
                >
                  {dayNum}
                </span>
                {isCurrentMonth && (
                  <Link
                    href={`/admin/schedule/new?date=${day}`}
                    className="flex h-5 w-5 items-center justify-center rounded text-brand-cream-600 hover:text-brand-brass-300"
                    title={`Add event on ${day}`}
                  >
                    <span className="text-sm leading-none">+</span>
                  </Link>
                )}
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 4).map((ev) => (
                  <MonthEventPill key={ev.id} event={ev} />
                ))}
                {dayEvents.length > 4 && (
                  <p className="px-1 text-[10px] text-brand-cream-500">
                    +{dayEvents.length - 4} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthEventPill({ event }: { event: EventWithCrew }) {
  const color = EVENT_TYPE_COLORS[event.eventType as ScheduledEventType];
  const isCancelled = event.status === "CANCELLED";
  const isDraft = event.status === "DRAFT";

  return (
    <Link href={`/admin/schedule/${event.id}`}>
      <div
        className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight transition hover:brightness-110 ${
          isCancelled
            ? "bg-gray-700/60 text-gray-400 line-through"
            : `${color} ${isDraft ? "opacity-60" : ""}`
        }`}
        title={`${event.title} · ${formatEventTime(event.startTime)}`}
      >
        <span className="mr-1 opacity-70">{formatEventTime(event.startTime)}</span>
        {event.title}
        {isCancelled && (
          <span className="ml-1 text-[9px] text-red-400">✕</span>
        )}
        {isDraft && !isCancelled && (
          <span className="ml-1 text-[9px] opacity-60">draft</span>
        )}
      </div>
    </Link>
  );
}
