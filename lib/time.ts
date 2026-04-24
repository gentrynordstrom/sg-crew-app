import type { Role, TimeEntry, User } from "@prisma/client";

/**
 * Sainte Genevieve, MO sits in America/Chicago — used for rendering and CSV
 * export so payroll sees local shift times, not UTC.
 */
export const PAYROLL_TIMEZONE = "America/Chicago";

/**
 * Compute paid minutes for a shift:
 *   clockOut - clockIn - (breakEnd - breakStart)
 *
 * Returns 0 if the shift hasn't ended. Ignores the break if it hasn't finished
 * (an unfinished break shouldn't silently subtract unbounded minutes).
 */
export function paidMinutes(entry: {
  clockInAt: Date;
  clockOutAt: Date | null;
  breakStartAt: Date | null;
  breakEndAt: Date | null;
}): number {
  if (!entry.clockOutAt) return 0;
  const gross = entry.clockOutAt.getTime() - entry.clockInAt.getTime();
  let breakMs = 0;
  if (entry.breakStartAt && entry.breakEndAt) {
    breakMs = Math.max(
      0,
      entry.breakEndAt.getTime() - entry.breakStartAt.getTime()
    );
  }
  const net = Math.max(0, gross - breakMs);
  return Math.round(net / 60000);
}

export function breakMinutes(entry: {
  breakStartAt: Date | null;
  breakEndAt: Date | null;
}): number {
  if (!entry.breakStartAt || !entry.breakEndAt) return 0;
  return Math.max(
    0,
    Math.round(
      (entry.breakEndAt.getTime() - entry.breakStartAt.getTime()) / 60000
    )
  );
}

export function minutesToHoursDecimal(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export function formatHoursDecimal(minutes: number): string {
  return minutesToHoursDecimal(minutes).toFixed(2);
}

/**
 * HH:MM:SS from milliseconds. Used in the live-ticking clock card.
 */
export function formatDurationHms(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

/**
 * Rolling 14-day window ending today (inclusive). Used as the default
 * pay-period on the admin timesheet page. Dates are expressed in the
 * payroll timezone's calendar day, then converted to UTC bounds.
 */
export function defaultDateRange(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const to = ymdInPayrollTz(now);
  const fromDate = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
  const from = ymdInPayrollTz(fromDate);
  return { from, to };
}

/**
 * Format a Date as YYYY-MM-DD in the payroll timezone.
 */
export function ymdInPayrollTz(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYROLL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a UTC instant representing the **start** of
 * that calendar day in the payroll timezone. The offset for America/Chicago
 * can be -5 or -6 depending on DST; we compute it by probing.
 */
export function startOfPayrollDay(ymd: string): Date {
  return zonedDayBoundary(ymd, 0, 0, 0, 0);
}

/**
 * End of a payroll day (exclusive upper bound works well with `< end`).
 * We use 23:59:59.999 so a BETWEEN query is inclusive and a strict `<` query
 * against the next day's start is equivalent.
 */
export function endOfPayrollDay(ymd: string): Date {
  return zonedDayBoundary(ymd, 23, 59, 59, 999);
}

function zonedDayBoundary(
  ymd: string,
  h: number,
  m: number,
  s: number,
  ms: number
): Date {
  const [yy, mm, dd] = ymd.split("-").map((n) => parseInt(n, 10));
  // Start with the naive UTC interpretation, then correct for the TZ offset.
  const naive = Date.UTC(yy, mm - 1, dd, h, m, s, ms);
  const offsetMinutes = tzOffsetMinutes(PAYROLL_TIMEZONE, new Date(naive));
  return new Date(naive - offsetMinutes * 60_000);
}

/**
 * Returns the timezone offset (in minutes, positive for east of UTC) of
 * `timeZone` at the given instant. Uses the trick of formatting a known
 * UTC instant in the target zone and diffing.
 */
function tzOffsetMinutes(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(at);
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
  return Math.round((asUtc - at.getTime()) / 60_000);
}

export function formatLocalDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PAYROLL_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    weekday: "short",
  }).format(d);
}

export function formatLocalTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PAYROLL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatLocalDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PAYROLL_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Produce the `HH:MM` (24h) wall-clock for a given instant, in the payroll TZ.
 * Used in the CSV "Clock In" and "Clock Out" columns.
 */
export function formatLocalTime24(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PAYROLL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Convert a local YYYY-MM-DDTHH:MM (payroll-TZ) string from a <input
 * type="datetime-local"> into a proper UTC Date. Native input value has no
 * timezone information so we must interpret it in the payroll zone.
 */
export function parseLocalDateTime(value: string): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, yy, mm, dd, hh, mi] = m;
  const naive = Date.UTC(+yy, +mm - 1, +dd, +hh, +mi, 0, 0);
  const offset = tzOffsetMinutes(PAYROLL_TIMEZONE, new Date(naive));
  return new Date(naive - offset * 60_000);
}

/**
 * Inverse of `parseLocalDateTime` — produce a string suitable for a
 * `<input type="datetime-local" value={...}>` default.
 */
export function toLocalInputValue(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYROLL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mi = parts.find((p) => p.type === "minute")?.value ?? "00";
  const hour = h === "24" ? "00" : h;
  return `${y}-${m}-${day}T${hour}:${mi}`;
}

// ---------- CSV export ----------

export interface CsvRowEntry extends TimeEntry {
  user: Pick<User, "name" | "phone" | "role">;
}

/**
 * Generic payroll CSV. Both ADP Run and Paychex Flex accept hour imports with
 * these fields (column names may need to be renamed to match their specific
 * templates — but the data is here).
 */
export function buildTimesheetCsv(rows: CsvRowEntry[]): string {
  const header = [
    "Employee Name",
    "Employee Phone",
    "Role",
    "Shift Date",
    "Clock In",
    "Clock Out",
    "Break Minutes",
    "Paid Hours",
    "Note",
    "Status",
  ];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.user.name,
        r.user.phone,
        r.user.role as Role,
        ymdInPayrollTz(r.clockInAt),
        formatLocalTime24(r.clockInAt),
        r.clockOutAt ? formatLocalTime24(r.clockOutAt) : "",
        breakMinutes(r).toString(),
        formatHoursDecimal(paidMinutes(r)),
        r.note ?? "",
        r.status,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\r\n") + "\r\n";
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export interface PaychexCsvRowEntry extends TimeEntry {
  user: Pick<User, "name" | "phone" | "role"> & { paychexId?: string | null };
}

/**
 * Paychex Flex-compatible CSV for manual import.
 * Format: Employee ID, Last Name, First Name, Work Date, Pay Code, Hours
 *
 * Splits each week individually to detect overtime (> 40 hrs/week).
 * Pay Code: REG = regular, OT = overtime hours beyond 40 in the work week.
 */
export function buildPaychexCsv(rows: PaychexCsvRowEntry[]): string {
  const header = [
    "Employee ID",
    "Last Name",
    "First Name",
    "Work Date",
    "Pay Code",
    "Hours",
  ];
  const lines = [header.map(csvEscape).join(",")];

  // Group finished shifts by employee to compute weekly OT
  // Week key: userId + ISO week (Mon-based)
  const weeklyMinutes = new Map<string, number>();

  // Sort ascending so weekly running totals accumulate in time order
  const sorted = [...rows].sort(
    (a, b) => a.clockInAt.getTime() - b.clockInAt.getTime()
  );

  for (const r of sorted) {
    if (!r.clockOutAt) continue; // skip open shifts

    const mins = paidMinutes(r);
    if (mins === 0) continue;

    const nameparts = r.user.name.trim().split(/\s+/);
    const firstName = nameparts.slice(0, -1).join(" ") || nameparts[0];
    const lastName = nameparts.length > 1 ? nameparts[nameparts.length - 1] : "";
    const employeeId = r.user.paychexId?.trim() || r.userId;
    const workDate = ymdInPayrollTz(r.clockInAt);

    // ISO week key for OT tracking
    const weekKey = `${r.userId}:${isoWeekKey(r.clockInAt)}`;
    const prevMins = weeklyMinutes.get(weekKey) ?? 0;
    const newTotal = prevMins + mins;
    weeklyMinutes.set(weekKey, newTotal);

    const WEEKLY_OT_MINS = 40 * 60;
    let regMins: number;
    let otMins: number;

    if (prevMins >= WEEKLY_OT_MINS) {
      // Already in OT territory — all these minutes are OT
      regMins = 0;
      otMins = mins;
    } else if (newTotal > WEEKLY_OT_MINS) {
      // This shift straddles the 40-hour threshold
      regMins = WEEKLY_OT_MINS - prevMins;
      otMins = mins - regMins;
    } else {
      regMins = mins;
      otMins = 0;
    }

    if (regMins > 0) {
      lines.push(
        [employeeId, lastName, firstName, workDate, "REG",
          minutesToHoursDecimal(regMins).toFixed(2)]
          .map(csvEscape).join(",")
      );
    }
    if (otMins > 0) {
      lines.push(
        [employeeId, lastName, firstName, workDate, "OT",
          minutesToHoursDecimal(otMins).toFixed(2)]
          .map(csvEscape).join(",")
      );
    }
  }

  return lines.join("\r\n") + "\r\n";
}

/** Returns a string identifying the Mon-Sun ISO week containing `d`. */
function isoWeekKey(d: Date): string {
  const ymd = ymdInPayrollTz(d);
  const [y, m, day] = ymd.split("-").map(Number);
  const asDate = new Date(Date.UTC(y, m - 1, day));
  const dow = asDate.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(asDate.getTime() + diff * 86400000);
  return mon.toISOString().slice(0, 10);
}
