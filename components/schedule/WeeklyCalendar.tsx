"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ScheduledEvent,
  ScheduledEventType,
  ScheduledEventStatus,
  ScheduledShift,
  User,
  Role,
} from "@prisma/client";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  formatWeekDayLabel,
  formatEventTime,
} from "@/lib/schedule";
import { publishWeek } from "@/app/admin/schedule/actions";

type EventWithCrew = ScheduledEvent & {
  shifts: (ScheduledShift & {
    user: Pick<User, "id" | "name" | "role">;
  })[];
};

interface WeeklyCalendarProps {
  days: string[];
  events: EventWithCrew[];
  monday: string;
  hasDrafts: boolean;
}

export function WeeklyCalendar({
  days,
  events,
  monday,
  hasDrafts,
}: WeeklyCalendarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    if (
      !confirm(
        "Publish all draft events for this week? Crew members will be able to see them."
      )
    )
      return;
    startTransition(async () => {
      const res = await publishWeek(monday);
      if (res.ok) router.refresh();
    });
  }

  // Group events by their date string
  const byDay = new Map<string, EventWithCrew[]>();
  for (const day of days) byDay.set(day, []);
  for (const ev of events) {
    const ymd = ev.date.toISOString().slice(0, 10);
    byDay.get(ymd)?.push(ev);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      {hasDrafts && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-brand-brass-500/40 bg-brand-brass-900/20 px-4 py-3">
          <p className="text-sm text-brand-brass-200">
            This week has unpublished draft events. Publish to make them visible to crew.
          </p>
          <button
            onClick={handlePublish}
            disabled={isPending}
            className="ml-4 rounded-full bg-brand-brass-400 px-4 py-1.5 text-sm font-semibold text-brand-moss-800 transition hover:bg-brand-brass-300 disabled:opacity-50"
          >
            {isPending ? "Publishing…" : "Publish week"}
          </button>
        </div>
      )}

      {/* Desktop: 7-column grid */}
      <div className="hidden md:grid md:grid-cols-7 md:gap-2">
        {days.map((day) => {
          const dayEvents = byDay.get(day) ?? [];
          const isToday = day === today;
          return (
            <div key={day} className="min-h-[200px]">
              <div
                className={`mb-2 rounded-lg px-2 py-1.5 text-center text-xs font-semibold ${
                  isToday
                    ? "bg-brand-brass-400 text-brand-moss-800"
                    : "text-brand-cream-400"
                }`}
              >
                {formatWeekDayLabel(day)}
              </div>
              <div className="space-y-1.5">
                {dayEvents.map((ev) => (
                  <EventBlock key={ev.id} event={ev} />
                ))}
                <Link
                  href={`/admin/schedule/new?date=${day}`}
                  className="flex h-7 w-full items-center justify-center rounded-lg border border-dashed border-brand-cream-700/30 text-xs text-brand-cream-600 hover:border-brand-brass-400/40 hover:text-brand-brass-300"
                >
                  +
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: stacked list per day */}
      <div className="space-y-4 md:hidden">
        {days.map((day) => {
          const dayEvents = byDay.get(day) ?? [];
          const isToday = day === today;
          return (
            <div key={day}>
              <div
                className={`mb-2 flex items-center justify-between rounded-lg px-3 py-2 ${
                  isToday
                    ? "bg-brand-brass-400 text-brand-moss-800"
                    : "bg-brand-moss-800/60 text-brand-cream-300"
                }`}
              >
                <span className="text-sm font-semibold">
                  {formatWeekDayLabel(day)}
                </span>
                <Link
                  href={`/admin/schedule/new?date=${day}`}
                  className={`text-xs font-medium ${
                    isToday
                      ? "text-brand-moss-700 hover:text-brand-moss-900"
                      : "text-brand-cream-400 hover:text-brand-brass-300"
                  }`}
                >
                  + Add
                </Link>
              </div>
              {dayEvents.length === 0 ? (
                <p className="px-3 text-xs italic text-brand-cream-600">
                  No events scheduled
                </p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((ev) => (
                    <EventBlock key={ev.id} event={ev} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventBlock({ event }: { event: EventWithCrew }) {
  const color = EVENT_TYPE_COLORS[event.eventType as ScheduledEventType];
  const isDraft = event.status === "DRAFT";
  const isCancelled = event.status === "CANCELLED";

  return (
    <Link href={`/admin/schedule/${event.id}`}>
      <div
        className={`rounded-lg px-2 py-1.5 ring-1 transition hover:brightness-110 ${
          isCancelled
            ? "bg-gray-800/60 ring-gray-600/40 opacity-50"
            : `${color} ${isDraft ? "opacity-60" : ""}`
        }`}
      >
        <div className="flex items-start justify-between gap-1">
          <p className={`truncate text-xs font-semibold leading-tight ${isCancelled ? "line-through text-gray-400" : ""}`}>
            {event.title}
          </p>
          <div className="flex shrink-0 gap-1">
            {isCancelled && (
              <span className="rounded bg-red-900/60 px-1 py-0.5 text-[10px] font-medium text-red-300">
                Cancelled
              </span>
            )}
            {isDraft && !isCancelled && (
              <span className="rounded bg-black/20 px-1 py-0.5 text-[10px] font-medium">
                Draft
              </span>
            )}
          </div>
        </div>
        <p className={`mt-0.5 text-[11px] ${isCancelled ? "text-gray-500" : "opacity-80"}`}>
          {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}
        </p>
        {event.shifts.length > 0 && (
          <p className={`mt-0.5 text-[11px] ${isCancelled ? "text-gray-600" : "opacity-70"}`}>
            {event.shifts.length} crew
          </p>
        )}
      </div>
    </Link>
  );
}
