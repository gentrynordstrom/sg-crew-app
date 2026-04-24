/**
 * Helpers that build the `column_values` JSON object that Monday expects for
 * `create_item` / `change_multiple_column_values`.
 *
 * Monday column value formats:
 *   status   → { "label": "Completed" }
 *   text     → "the text value"          (plain string)
 *   numbers  → "42"                       (stringified number)
 *   date     → { "date": "2026-04-23" }
 *   long_text→ { "text": "..." }
 *   dropdown → { "labels": ["Cash"] }
 */

type ColumnValueMap = Record<string, unknown>;

export function statusValue(label: string): { label: string } {
  return { label };
}

export function textValue(value: string): string {
  return value;
}

export function numberValue(n: number | string): string {
  return String(n);
}

export function dateValue(isoOrYmd: string): { date: string } {
  // Accept "2026-04-23" or a full ISO string; extract the date portion
  return { date: isoOrYmd.slice(0, 10) };
}

export function longTextValue(text: string): { text: string } {
  return { text };
}

export function dropdownValue(labels: string[]): { labels: string[] } {
  return { labels };
}

/**
 * Build a complete column_values object to pass to Monday mutations.
 * Each entry in `fields` maps a Monday column ID to its typed value.
 * Falsy values (empty string, null, undefined) are omitted so we don't
 * accidentally clear columns that already have data.
 */
export function buildColumnValues(
  fields: ColumnValueMap
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [colId, val] of Object.entries(fields)) {
    if (val === null || val === undefined || val === "") continue;
    out[colId] = val;
  }
  return out;
}

/** Format a Date or ISO string as "MM/DD/YYYY" (Monday item name convention). */
export function formatMdy(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput + "T12:00:00") : dateInput;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}
