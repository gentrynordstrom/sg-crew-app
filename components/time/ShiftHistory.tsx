"use client";

import { useState, useTransition } from "react";
import type { TimeEntry } from "@prisma/client";
import {
  formatHoursDecimal,
  formatLocalDate,
  formatLocalTime,
  paidMinutes,
  breakMinutes,
  parseLocalDateTime,
  toLocalInputValue,
} from "@/lib/time";
import {
  updateMyEntry,
  type ActionResult,
} from "@/app/time/actions";

interface ShiftRow
  extends Pick<
    TimeEntry,
    | "id"
    | "clockInAt"
    | "clockOutAt"
    | "breakStartAt"
    | "breakEndAt"
    | "note"
    | "status"
  > {}

interface ShiftHistoryProps {
  shifts: ShiftRow[];
}

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-brand-moss-400/50 bg-brand-moss-900/60 px-3 py-2 text-sm text-brand-cream-100 placeholder:text-brand-cream-600 focus:border-brand-brass-400 focus:outline-none focus:ring-2 focus:ring-brand-brass-400/30";

const LABEL_CLASS = "block text-xs font-medium text-brand-cream-400";

export function ShiftHistory({ shifts }: ShiftHistoryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (shifts.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/40 px-5 py-8 text-center text-sm text-brand-cream-400">
        No shifts in the last two weeks yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {shifts.map((s) => {
        const editable = s.status === "OPEN" && !!s.clockOutAt;
        const active = !s.clockOutAt;
        return (
          <li
            key={s.id}
            className="rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-brand-cream-100">
                  {formatLocalDate(s.clockInAt)}
                </p>
                <p className="mt-1 text-sm text-brand-cream-300">
                  {formatLocalTime(s.clockInAt)} →{" "}
                  {s.clockOutAt ? (
                    formatLocalTime(s.clockOutAt)
                  ) : (
                    <span className="text-brand-brass-300">in progress</span>
                  )}
                </p>
                {s.note && (
                  <p className="mt-1 text-xs italic text-brand-cream-500">
                    {s.note}
                  </p>
                )}
              </div>
              <div className="flex items-start gap-4">
                <div className="text-right">
                  <p className="text-xs text-brand-cream-500">Paid hours</p>
                  <p className="font-mono text-lg font-semibold text-brand-cream-100 tabular-nums">
                    {active ? "—" : formatHoursDecimal(paidMinutes(s))}
                  </p>
                  {breakMinutes(s) > 0 && (
                    <p className="text-xs text-brand-cream-500">
                      {breakMinutes(s)} min break
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusPill status={s.status} active={active} />
                  {editable && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingId(editingId === s.id ? null : s.id)
                      }
                      className="rounded-full border border-brand-moss-400/50 bg-brand-moss-700/60 px-3 py-1 text-xs font-medium text-brand-cream-200 hover:border-brand-brass-400/60 hover:text-brand-brass-200"
                    >
                      {editingId === s.id ? "Close" : "Edit"}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {editingId === s.id && editable && (
              <ShiftEditor
                shift={s}
                onDone={() => setEditingId(null)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function StatusPill({
  status,
  active,
}: {
  status: "OPEN" | "LOCKED";
  active: boolean;
}) {
  if (active) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-900/40 px-2.5 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-inset ring-emerald-400/40">
        Active
      </span>
    );
  }
  if (status === "LOCKED") {
    return (
      <span className="inline-flex items-center rounded-full bg-brand-moss-900/60 px-2.5 py-1 text-xs font-semibold text-brand-cream-400 ring-1 ring-inset ring-brand-moss-400/40">
        Locked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-brand-brass-700/40 px-2.5 py-1 text-xs font-semibold text-brand-brass-100 ring-1 ring-inset ring-brand-brass-300/40">
      Editable
    </span>
  );
}

function ShiftEditor({
  shift,
  onDone,
}: {
  shift: ShiftRow;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    const clockInStr = (formData.get("clockInAt") ?? "").toString();
    const clockOutStr = (formData.get("clockOutAt") ?? "").toString();
    const breakStartStr = (formData.get("breakStartAt") ?? "").toString();
    const breakEndStr = (formData.get("breakEndAt") ?? "").toString();
    const note = (formData.get("note") ?? "").toString();

    startTransition(async () => {
      const res: ActionResult = await updateMyEntry({
        id: shift.id,
        clockInAt: parseLocalDateTime(clockInStr),
        clockOutAt: parseLocalDateTime(clockOutStr),
        breakStartAt: breakStartStr
          ? parseLocalDateTime(breakStartStr)
          : null,
        breakEndAt: breakEndStr ? parseLocalDateTime(breakEndStr) : null,
        note: note || null,
      });
      if (!res.ok) setError(res.error);
      else onDone();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="border-t border-brand-moss-500/40 bg-brand-moss-900/40 px-5 py-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`in-${shift.id}`} className={LABEL_CLASS}>
            Clock in
          </label>
          <input
            id={`in-${shift.id}`}
            name="clockInAt"
            type="datetime-local"
            required
            defaultValue={toLocalInputValue(shift.clockInAt)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor={`out-${shift.id}`} className={LABEL_CLASS}>
            Clock out
          </label>
          <input
            id={`out-${shift.id}`}
            name="clockOutAt"
            type="datetime-local"
            required
            defaultValue={
              shift.clockOutAt ? toLocalInputValue(shift.clockOutAt) : ""
            }
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor={`bs-${shift.id}`} className={LABEL_CLASS}>
            Break start (optional)
          </label>
          <input
            id={`bs-${shift.id}`}
            name="breakStartAt"
            type="datetime-local"
            defaultValue={
              shift.breakStartAt ? toLocalInputValue(shift.breakStartAt) : ""
            }
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor={`be-${shift.id}`} className={LABEL_CLASS}>
            Break end (optional)
          </label>
          <input
            id={`be-${shift.id}`}
            name="breakEndAt"
            type="datetime-local"
            defaultValue={
              shift.breakEndAt ? toLocalInputValue(shift.breakEndAt) : ""
            }
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`note-${shift.id}`} className={LABEL_CLASS}>
            Note (optional)
          </label>
          <input
            id={`note-${shift.id}`}
            name="note"
            type="text"
            maxLength={200}
            defaultValue={shift.note ?? ""}
            placeholder="e.g. covered Sarah's shift"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-200 ring-1 ring-red-400/40"
        >
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-brand-moss-400/50 bg-brand-moss-700/60 px-4 py-1.5 text-sm font-medium text-brand-cream-200 hover:border-brand-brass-400/60 hover:text-brand-brass-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-touch items-center justify-center rounded-full bg-brand-brass-400 px-5 py-1.5 text-sm font-semibold text-brand-moss-800 shadow-sm transition hover:bg-brand-brass-300 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
