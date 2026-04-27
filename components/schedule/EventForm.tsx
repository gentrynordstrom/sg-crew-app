"use client";

import { useState, useTransition } from "react";
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
  toTimeInputValue,
  todayYmd,
  combineDateAndTime,
} from "@/lib/schedule";
import { ROLE_LABELS, ROLE_BADGE_CLASSES } from "@/lib/roles";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  setEventCrew,
  type CrewAssignment,
} from "@/app/admin/schedule/actions";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as ScheduledEventType[];

type UserOption = Pick<User, "id" | "name" | "role">;

type ShiftWithTimes = ScheduledShift & { user: UserOption };

type ExistingEvent = ScheduledEvent & {
  shifts: ShiftWithTimes[];
};

interface EventFormProps {
  mode: "create" | "edit";
  event?: ExistingEvent;
  allUsers: UserOption[];
  defaultDate?: string;
}

interface CrewTime {
  shiftStart: string; // HH:MM
  shiftEnd: string;   // HH:MM
}

const INPUT_CLASS =
  "w-full rounded-xl bg-brand-moss-800/60 px-4 py-3 text-brand-cream-100 placeholder-brand-cream-600 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 min-h-[48px] appearance-none";
const LABEL_CLASS =
  "mb-1.5 block text-sm font-medium text-brand-cream-300";
const TIME_INPUT_CLASS =
  "w-full rounded-lg bg-brand-moss-900/60 px-3 py-2 text-sm text-brand-cream-100 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 appearance-none";

const ROLE_ORDER: Role[] = [
  "CAPTAIN",
  "DECKHAND",
  "MECHANIC",
  "HOSPITALITY",
  "NARRATOR",
  "ADMIN",
];

export function EventForm({
  mode,
  event,
  allUsers,
  defaultDate,
}: EventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Track the event-level times so we can pre-fill new crew assignments
  const defaultEventStart = event?.startTime
    ? toTimeInputValue(event.startTime)
    : "09:00";
  const defaultEventEnd = event?.endTime
    ? toTimeInputValue(event.endTime)
    : "17:00";
  const [eventStart, setEventStart] = useState(defaultEventStart);
  const [eventEnd, setEventEnd] = useState(defaultEventEnd);

  const initialAssigned = new Set(event?.shifts.map((s) => s.userId) ?? []);

  // Build initial crewTimes from existing shift overrides
  const initialCrewTimes = new Map<string, CrewTime>();
  const initialCrewRoles = new Map<string, Role>();
  for (const s of event?.shifts ?? []) {
    initialCrewTimes.set(s.userId, {
      shiftStart: s.shiftStart ? toTimeInputValue(s.shiftStart) : defaultEventStart,
      shiftEnd: s.shiftEnd ? toTimeInputValue(s.shiftEnd) : defaultEventEnd,
    });
    if (s.roleForShift) {
      initialCrewRoles.set(s.userId, s.roleForShift);
    }
  }

  const [assigned, setAssigned] = useState<Set<string>>(initialAssigned);
  const [crewTimes, setCrewTimes] = useState<Map<string, CrewTime>>(initialCrewTimes);
  const [crewRoles, setCrewRoles] = useState<Map<string, Role>>(initialCrewRoles);

  function toggleUser(userId: string) {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        setCrewTimes((ct) => {
          const m = new Map(ct);
          m.delete(userId);
          return m;
        });
        setCrewRoles((cr) => {
          const m = new Map(cr);
          m.delete(userId);
          return m;
        });
      } else {
        next.add(userId);
        setCrewTimes((ct) => {
          if (ct.has(userId)) return ct;
          const m = new Map(ct);
          m.set(userId, { shiftStart: eventStart, shiftEnd: eventEnd });
          return m;
        });
      }
      return next;
    });
  }

  function updateCrewTime(
    userId: string,
    field: "shiftStart" | "shiftEnd",
    value: string
  ) {
    setCrewTimes((prev) => {
      const m = new Map(prev);
      const existing = m.get(userId) ?? { shiftStart: eventStart, shiftEnd: eventEnd };
      m.set(userId, { ...existing, [field]: value });
      return m;
    });
  }

  function handleSubmit(fd: FormData) {
    setFormError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createEvent(fd)
          : await updateEvent(fd);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      const dateStr = fd.get("date") as string;

      const eventStartDate = combineDateAndTime(dateStr, eventStart);
      const eventEndDate = combineDateAndTime(dateStr, eventEnd);

      // Look up each user's primary role to determine if roleForShift is actually an override
      const userMap = new Map(allUsers.map((u) => [u.id, u]));

      const crewAssignments: CrewAssignment[] = Array.from(assigned).map(
        (userId) => {
          const times = crewTimes.get(userId);
          const shiftStart = times
            ? combineDateAndTime(dateStr, times.shiftStart)
            : eventStartDate;
          const shiftEnd = times
            ? combineDateAndTime(dateStr, times.shiftEnd)
            : eventEndDate;

          const roleOverride = crewRoles.get(userId) ?? null;
          const primaryRole = userMap.get(userId)?.role ?? null;

          return {
            userId,
            shiftStart:
              shiftStart.getTime() !== eventStartDate.getTime() ? shiftStart : null,
            shiftEnd:
              shiftEnd.getTime() !== eventEndDate.getTime() ? shiftEnd : null,
            // Only persist if it actually differs from the user's primary role
            roleForShift: roleOverride !== primaryRole ? roleOverride : null,
          };
        }
      );

      await setEventCrew(result.eventId, crewAssignments);
      router.push(`/admin/schedule/${result.eventId}`);
    });
  }

  async function handleDelete() {
    if (!event) return;
    if (
      !confirm(
        `Delete "${event.title}"? All crew assignments will also be removed. This cannot be undone.`
      )
    )
      return;
    startTransition(async () => {
      await deleteEvent(event.id);
      router.push("/admin/schedule");
    });
  }

  const today = defaultDate ?? event?.date.toISOString().slice(0, 10) ?? todayYmd();

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    users: allUsers.filter((u) => u.role === role),
  })).filter((g) => g.users.length > 0);

  return (
    <form action={handleSubmit} className="space-y-5">
      {mode === "edit" && event && (
        <input type="hidden" name="id" value={event.id} />
      )}

      {formError && (
        <div className="rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {formError}
        </div>
      )}

      <div>
        <label htmlFor="title" className={LABEL_CLASS}>
          Event title <span className="text-brand-brass-400">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="e.g. Sunset Dinner Cruise"
          defaultValue={event?.title ?? ""}
          className={INPUT_CLASS}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className={LABEL_CLASS}>
            Date <span className="text-brand-brass-400">*</span>
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={today}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="eventType" className={LABEL_CLASS}>
            Type <span className="text-brand-brass-400">*</span>
          </label>
          <select
            id="eventType"
            name="eventType"
            required
            defaultValue={event?.eventType ?? "CRUISE"}
            className={INPUT_CLASS}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className={LABEL_CLASS}>
            Start time <span className="text-brand-brass-400">*</span>
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            required
            value={eventStart}
            onChange={(e) => setEventStart(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="endTime" className={LABEL_CLASS}>
            End time <span className="text-brand-brass-400">*</span>
          </label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            required
            value={eventEnd}
            onChange={(e) => setEventEnd(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label htmlFor="status" className={LABEL_CLASS}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={event?.status ?? "DRAFT"}
          className={INPUT_CLASS}
        >
          <option value="DRAFT">Draft (not visible to crew)</option>
          <option value="PUBLISHED">Published (visible to crew)</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes" className={LABEL_CLASS}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Special instructions, charter details, etc."
          defaultValue={event?.notes ?? ""}
          className={`${INPUT_CLASS} min-h-0 resize-none`}
        />
      </div>

      {/* ── Crew Assignment ──────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-sm font-medium text-brand-cream-300">
          Assign Crew
          {assigned.size > 0 && (
            <span className="ml-2 rounded-full bg-brand-brass-700/40 px-2 py-0.5 text-xs text-brand-brass-200">
              {assigned.size} assigned
            </span>
          )}
        </p>
        <div className="space-y-4 rounded-xl bg-brand-moss-800/40 p-4 ring-1 ring-brand-cream-900/30">
          {grouped.map(({ role, users }) => (
            <div key={role}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-cream-500">
                {ROLE_LABELS[role]}
              </p>
              <div className="space-y-2">
                {users.map((u) => {
                  const on = assigned.has(u.id);
                  const effectiveRole = crewRoles.get(u.id) ?? u.role;
                  const isCustomRole = effectiveRole !== u.role;
                  const times = crewTimes.get(u.id);
                  const isCustomStart = times && times.shiftStart !== eventStart;
                  const isCustomEnd = times && times.shiftEnd !== eventEnd;
                  const hasOverrides = isCustomRole || isCustomStart || isCustomEnd;

                  return (
                    <div key={u.id}>
                      {/* Name toggle + inline role selector */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleUser(u.id)}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                            on
                              ? "bg-brand-brass-400 text-brand-moss-800 ring-brand-brass-400"
                              : "bg-brand-moss-700/60 text-brand-cream-300 ring-brand-cream-700/40 hover:ring-brand-brass-400/60 hover:text-brand-brass-200"
                          }`}
                        >
                          {u.name}
                        </button>

                        {/* Role override — only visible when assigned */}
                        {on && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-brand-cream-600">as</span>
                            <select
                              value={effectiveRole}
                              onChange={(e) => {
                                const val = e.target.value as Role;
                                setCrewRoles((prev) => {
                                  const m = new Map(prev);
                                  if (val === u.role) m.delete(u.id);
                                  else m.set(u.id, val);
                                  return m;
                                });
                              }}
                              className={`rounded-lg px-2 py-1 text-xs ring-1 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 appearance-none ${
                                isCustomRole
                                  ? "bg-brand-brass-900/40 ring-brand-brass-400/60 text-brand-brass-200 font-semibold"
                                  : "bg-brand-moss-800/80 ring-brand-cream-900/40 text-brand-cream-400"
                              }`}
                            >
                              {ROLE_ORDER.map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </option>
                              ))}
                            </select>
                            {isCustomRole && (
                              <span className="text-[10px] text-brand-brass-400">
                                ← override
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Per-person time overrides — collapsed by default, shown inline when assigned */}
                      {on && times && (
                        <div className="ml-3 mt-1.5 flex items-center gap-2 border-l-2 border-brand-cream-800/30 pl-3">
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] text-brand-cream-600">Start</label>
                            <input
                              type="time"
                              value={times.shiftStart}
                              onChange={(e) => updateCrewTime(u.id, "shiftStart", e.target.value)}
                              className={`rounded px-2 py-1 text-xs ring-1 focus:outline-none focus:ring-brand-brass-400 appearance-none ${
                                isCustomStart
                                  ? "bg-brand-brass-900/30 ring-brand-brass-400/50 text-brand-brass-200"
                                  : "bg-brand-moss-900/40 ring-brand-cream-900/30 text-brand-cream-400"
                              }`}
                            />
                          </div>
                          <span className="text-brand-cream-700">–</span>
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] text-brand-cream-600">End</label>
                            <input
                              type="time"
                              value={times.shiftEnd}
                              onChange={(e) => updateCrewTime(u.id, "shiftEnd", e.target.value)}
                              className={`rounded px-2 py-1 text-xs ring-1 focus:outline-none focus:ring-brand-brass-400 appearance-none ${
                                isCustomEnd
                                  ? "bg-brand-brass-900/30 ring-brand-brass-400/50 text-brand-brass-200"
                                  : "bg-brand-moss-900/40 ring-brand-cream-900/30 text-brand-cream-400"
                              }`}
                            />
                          </div>
                          {hasOverrides && (
                            <button
                              type="button"
                              onClick={() => {
                                setCrewTimes((prev) => {
                                  const m = new Map(prev);
                                  m.set(u.id, { shiftStart: eventStart, shiftEnd: eventEnd });
                                  return m;
                                });
                                setCrewRoles((prev) => {
                                  const m = new Map(prev);
                                  m.delete(u.id);
                                  return m;
                                });
                              }}
                              className="text-[10px] text-brand-cream-600 hover:text-brand-cream-300"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {mode === "edit" && event && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-full border border-red-700/40 bg-red-900/20 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-900/40 disabled:opacity-50"
          >
            Delete event
          </button>
        )}
        <div className="ml-auto flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-brand-cream-700/40 px-4 py-2.5 text-sm font-medium text-brand-cream-300 hover:border-brand-brass-400/60 hover:text-brand-brass-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-[44px] items-center rounded-full bg-brand-brass-400 px-6 py-2.5 text-sm font-semibold text-brand-moss-800 shadow-sm transition hover:bg-brand-brass-300 disabled:opacity-50"
          >
            {isPending
              ? "Saving…"
              : mode === "create"
              ? "Create event"
              : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
