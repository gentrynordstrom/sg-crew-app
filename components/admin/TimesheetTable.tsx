"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, useTransition } from "react";
import type { Role, TimeEntry, TimeEntryStatus } from "@prisma/client";
import { RoleBadge } from "@/components/RoleBadge";
import {
  breakMinutes,
  formatHoursDecimal,
  formatLocalDate,
  formatLocalTime,
  paidMinutes,
  parseLocalDateTime,
  toLocalInputValue,
} from "@/lib/time";
import {
  deleteEntry,
  editEntry,
  lockRange,
  unlockRange,
  type ActionResult,
} from "@/app/admin/timesheets/actions";

export interface TimesheetRow
  extends Pick<
    TimeEntry,
    | "id"
    | "clockInAt"
    | "clockOutAt"
    | "breakStartAt"
    | "breakEndAt"
    | "note"
    | "status"
  > {
  user: { id: string; name: string; role: Role; phone: string };
}

interface Props {
  rows: TimesheetRow[];
  from: string;
  to: string;
}

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-brand-moss-400/50 bg-brand-moss-900/60 px-3 py-2 text-sm text-brand-cream-100 focus:border-brand-brass-400 focus:outline-none focus:ring-2 focus:ring-brand-brass-400/30";

const LABEL_CLASS = "block text-xs font-medium text-brand-cream-400";

export function TimesheetTable({ rows, from, to }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [flash, setFlash] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);

  const totals = useMemo(() => {
    const people = new Set(rows.map((r) => r.user.id));
    let paidMins = 0;
    let openCount = 0;
    let lockedCount = 0;
    let activeCount = 0;
    for (const r of rows) {
      if (!r.clockOutAt) {
        activeCount += 1;
        continue;
      }
      paidMins += paidMinutes(r);
      if (r.status === "LOCKED") lockedCount += 1;
      else openCount += 1;
    }
    return {
      people: people.size,
      paidMins,
      openCount,
      lockedCount,
      activeCount,
      total: rows.length,
    };
  }, [rows]);

  function run(fn: () => Promise<ActionResult>) {
    setFlash(null);
    startTransition(async () => {
      const res = await fn();
      setFlash(
        res.ok
          ? { kind: "ok", text: res.message ?? "Done." }
          : { kind: "err", text: res.error }
      );
      router.refresh();
    });
  }

  function applyRange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("from", fromInput);
    params.set("to", toInput);
    router.push(`/admin/timesheets?${params.toString()}`);
  }

  const exportHref = `/admin/timesheets/export?from=${encodeURIComponent(
    from
  )}&to=${encodeURIComponent(to)}`;
  const paychexExportHref = `/admin/timesheets/export-paychex?from=${encodeURIComponent(
    from
  )}&to=${encodeURIComponent(to)}`;

  return (
    <div>
      {flash && (
        <div
          role="status"
          className={`mb-4 rounded-lg px-3 py-2 text-sm ring-1 ${
            flash.kind === "ok"
              ? "bg-emerald-900/40 text-emerald-100 ring-emerald-400/40"
              : "bg-red-900/40 text-red-200 ring-red-400/40"
          }`}
        >
          {flash.text}
        </div>
      )}

      <form
        onSubmit={applyRange}
        className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-4"
      >
        <div>
          <label htmlFor="from" className={LABEL_CLASS}>
            From
          </label>
          <input
            id="from"
            type="date"
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="to" className={LABEL_CLASS}>
            To
          </label>
          <input
            id="to"
            type="date"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <button
          type="submit"
          className="rounded-full border border-brand-moss-400/50 bg-brand-moss-700/60 px-4 py-2 text-sm font-medium text-brand-cream-200 hover:border-brand-brass-400/60 hover:text-brand-brass-200"
        >
          Apply
        </button>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (
                !confirm(
                  `Lock all completed OPEN entries from ${from} to ${to}? Crew will no longer be able to edit them.`
                )
              )
                return;
              const fd = new FormData();
              fd.set("from", from);
              fd.set("to", to);
              run(() => lockRange(fd));
            }}
            className="rounded-full border border-brand-brass-400/60 bg-brand-brass-700/30 px-4 py-2 text-sm font-medium text-brand-brass-100 hover:bg-brand-brass-700/50 disabled:opacity-50"
          >
            Lock range
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (
                !confirm(
                  `Unlock all LOCKED entries from ${from} to ${to}?`
                )
              )
                return;
              const fd = new FormData();
              fd.set("from", from);
              fd.set("to", to);
              run(() => unlockRange(fd));
            }}
            className="rounded-full border border-brand-moss-400/50 bg-brand-moss-700/60 px-4 py-2 text-sm font-medium text-brand-cream-200 hover:border-brand-brass-400/60 hover:text-brand-brass-200 disabled:opacity-50"
          >
            Unlock range
          </button>
          <a
            href={exportHref}
            className="inline-flex items-center rounded-full border border-brand-brass-400/60 bg-brand-brass-700/30 px-4 py-2 text-sm font-semibold text-brand-brass-100 shadow-sm transition hover:bg-brand-brass-700/50"
          >
            Export CSV
          </a>
          <a
            href={paychexExportHref}
            className="inline-flex items-center rounded-full bg-brand-brass-400 px-4 py-2 text-sm font-semibold text-brand-moss-800 shadow-sm transition hover:bg-brand-brass-300"
          >
            Export for Paychex
          </a>
        </div>
      </form>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="People" value={totals.people} />
        <Stat
          label="Paid hours"
          value={formatHoursDecimal(totals.paidMins)}
        />
        <Stat label="Open" value={totals.openCount} />
        <Stat label="Locked" value={totals.lockedCount} />
        <Stat label="In progress" value={totals.activeCount} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60">
        <table className="min-w-full divide-y divide-brand-moss-500/40 text-sm">
          <thead className="bg-brand-moss-900/50 text-left text-xs font-semibold uppercase tracking-[0.15em] text-brand-cream-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">In</th>
              <th className="px-4 py-3">Out</th>
              <th className="px-4 py-3">Break</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-moss-500/30">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-center text-brand-cream-400"
                >
                  No entries in this range.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const active = !r.clockOutAt;
              const editableByAdmin = r.status !== "LOCKED";
              return (
                <Fragment key={r.id}>
                  <tr className="align-middle">
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-cream-100">
                        {r.user.name}
                      </div>
                      <div className="mt-1">
                        <RoleBadge role={r.user.role} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-cream-300">
                      {formatLocalDate(r.clockInAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-brand-cream-200 tabular-nums">
                      {formatLocalTime(r.clockInAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-brand-cream-200 tabular-nums">
                      {r.clockOutAt ? (
                        formatLocalTime(r.clockOutAt)
                      ) : (
                        <span className="text-brand-brass-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brand-cream-300">
                      {breakMinutes(r) > 0 ? `${breakMinutes(r)}m` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-brand-cream-100 tabular-nums">
                      {active ? "—" : formatHoursDecimal(paidMinutes(r))}
                    </td>
                    <td className="px-4 py-3 text-xs italic text-brand-cream-400">
                      {r.note ?? ""}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} active={active} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {editableByAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingId(editingId === r.id ? null : r.id)
                            }
                            className="rounded-full border border-brand-moss-400/50 bg-brand-moss-700/60 px-3 py-1.5 text-xs font-medium text-brand-cream-200 hover:border-brand-brass-400/60 hover:text-brand-brass-200"
                          >
                            {editingId === r.id ? "Close" : "Edit"}
                          </button>
                        )}
                        {editableByAdmin && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              if (
                                !confirm(
                                  `Delete this entry for ${r.user.name}? This cannot be undone.`
                                )
                              )
                                return;
                              const fd = new FormData();
                              fd.set("id", r.id);
                              run(() => deleteEntry(fd));
                            }}
                            className="rounded-full border border-red-400/50 bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/40 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editingId === r.id && editableByAdmin && (
                    <tr>
                      <td
                        colSpan={9}
                        className="bg-brand-moss-900/40 px-4 py-4"
                      >
                        <AdminEditor
                          row={r}
                          onDone={() => setEditingId(null)}
                          onResult={(res) => {
                            setFlash(
                              res.ok
                                ? {
                                    kind: "ok",
                                    text: res.message ?? "Saved.",
                                  }
                                : { kind: "err", text: res.error }
                            );
                            if (res.ok) setEditingId(null);
                            router.refresh();
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-brand-moss-500/40 bg-brand-moss-800/60 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.15em] text-brand-cream-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold text-brand-cream-100 tabular-nums">
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  status,
  active,
}: {
  status: TimeEntryStatus;
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
      Open
    </span>
  );
}

function AdminEditor({
  row,
  onDone,
  onResult,
}: {
  row: TimesheetRow;
  onDone: () => void;
  onResult: (r: ActionResult) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const clockInStr = (formData.get("clockInAt") ?? "").toString();
    const clockOutStr = (formData.get("clockOutAt") ?? "").toString();
    const breakStartStr = (formData.get("breakStartAt") ?? "").toString();
    const breakEndStr = (formData.get("breakEndAt") ?? "").toString();
    const note = (formData.get("note") ?? "").toString();

    startTransition(async () => {
      const res = await editEntry({
        id: row.id,
        clockInAt: parseLocalDateTime(clockInStr),
        clockOutAt: clockOutStr
          ? parseLocalDateTime(clockOutStr)
          : null,
        breakStartAt: breakStartStr
          ? parseLocalDateTime(breakStartStr)
          : null,
        breakEndAt: breakEndStr
          ? parseLocalDateTime(breakEndStr)
          : null,
        note: note || null,
      });
      onResult(res);
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor={`ae-in-${row.id}`} className={LABEL_CLASS}>
            Clock in
          </label>
          <input
            id={`ae-in-${row.id}`}
            name="clockInAt"
            type="datetime-local"
            required
            defaultValue={toLocalInputValue(row.clockInAt)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor={`ae-out-${row.id}`} className={LABEL_CLASS}>
            Clock out
          </label>
          <input
            id={`ae-out-${row.id}`}
            name="clockOutAt"
            type="datetime-local"
            defaultValue={
              row.clockOutAt ? toLocalInputValue(row.clockOutAt) : ""
            }
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor={`ae-bs-${row.id}`} className={LABEL_CLASS}>
            Break start
          </label>
          <input
            id={`ae-bs-${row.id}`}
            name="breakStartAt"
            type="datetime-local"
            defaultValue={
              row.breakStartAt ? toLocalInputValue(row.breakStartAt) : ""
            }
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor={`ae-be-${row.id}`} className={LABEL_CLASS}>
            Break end
          </label>
          <input
            id={`ae-be-${row.id}`}
            name="breakEndAt"
            type="datetime-local"
            defaultValue={
              row.breakEndAt ? toLocalInputValue(row.breakEndAt) : ""
            }
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor={`ae-note-${row.id}`} className={LABEL_CLASS}>
            Note
          </label>
          <input
            id={`ae-note-${row.id}`}
            name="note"
            type="text"
            maxLength={200}
            defaultValue={row.note ?? ""}
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
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
