import type { ScheduledEventType } from "@prisma/client";
import { PAYROLL_TIMEZONE } from "./time";

export const EVENT_TYPE_LABELS: Record<ScheduledEventType, string> = {
  CRUISE: "Cruise",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
  UPKEEP: "Upkeep",
  HOSPITALITY: "Hospitality",
  OTHER: "Other",
};

export const EVENT_TYPE_COLORS: Record<ScheduledEventType, string> = {
  CRUISE: "bg-sky-900/60 text-sky-100 ring-sky-400/30",
  CLEANING: "bg-emerald-900/60 text-emerald-100 ring-emerald-400/30",
  MAINTENANCE: "bg-amber-900/60 text-amber-100 ring-amber-400/30",
  UPKEEP: "bg-orange-900/60 text-orange-100 ring-orange-400/30",
  HOSPITALITY: "bg-rose-900/60 text-rose-100 ring-rose-400/30",
  OTHER: "bg-brand-moss-900/60 text-brand-cream-200 ring-brand-cream-700/30",
};

/**
 * Returns the Monday of the ISO week containing `date`, as a YYYY-MM-DD string
 * in the payroll timezone.
 */
export function mondayOfWeek(date: Date): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYROLL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const y = +parts.find((p) => p.type === "year")!.value;
  const m = +parts.find((p) => p.type === "month")!.value;
  const d = +parts.find((p) => p.type === "day")!.value;
  const asDate = new Date(Date.UTC(y, m - 1, d));
  const dow = asDate.getUTCDay(); // 0=Sun … 6=Sat
  const diff = dow === 0 ? -6 : 1 - dow; // shift so Mon=0
  const mon = new Date(asDate.getTime() + diff * 86400000);
  return mon.toISOString().slice(0, 10);
}

/**
 * Given a Monday YYYY-MM-DD, return an array of 7 date strings for that week.
 */
export function weekDays(monday: string): string[] {
  const [y, m, d] = monday.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(base.getTime() + i * 86400000);
    return day.toISOString().slice(0, 10);
  });
}

/**
 * Add `n` weeks (positive or negative) to a YYYY-MM-DD monday string.
 */
export function offsetWeek(monday: string, n: number): string {
  const [y, m, d] = monday.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n * 7));
  return date.toISOString().slice(0, 10);
}

/**
 * Format a YYYY-MM-DD string as a readable date label, e.g. "Mon Apr 28".
 */
export function formatWeekDayLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * "Mon Apr 28 – Sun May 4, 2025" header label for a week.
 */
export function weekRangeLabel(monday: string): string {
  const days = weekDays(monday);
  const first = formatWeekDayLabel(days[0]);
  const last = formatWeekDayLabel(days[6]);
  const year = days[6].split("-")[0];
  return `${first} – ${last}, ${year}`;
}

/**
 * Format a DateTime as HH:MM AM/PM (12-hour) for display on schedule blocks.
 */
export function formatEventTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PAYROLL_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Combine a YYYY-MM-DD date string with an HH:MM time string into a UTC Date,
 * interpreting the time in the payroll timezone.
 */
export function combineDateAndTime(dateYmd: string, timeHhmm: string): Date {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const [h, min] = timeHhmm.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, h, min, 0, 0);
  // compute offset at that naive instant
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: PAYROLL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(naive));
  const get = (t: string) =>
    parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second")
  );
  const offset = Math.round((asUtc - naive) / 60000);
  return new Date(naive - offset * 60000);
}

/**
 * Extract HH:MM (24h) from a DateTime for an <input type="time"> default value.
 */
export function toTimeInputValue(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PAYROLL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Today as YYYY-MM-DD in payroll timezone.
 */
export function todayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYROLL_TIMEZONE,
  }).format(new Date());
}
