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
} from "@/lib/schedule";
import { ROLE_LABELS, ROLE_BADGE_CLASSES } from "@/lib/roles";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  setEventCrew,
} from "@/app/admin/schedule/actions";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as ScheduledEventType[];

type UserOption = Pick<User, "id" | "name" | "role">;

type ExistingEvent = ScheduledEvent & {
  shifts: (ScheduledShift & { user: UserOption })[];
};

interface EventFormProps {
  mode: "create" | "edit";
  event?: ExistingEvent;
  allUsers: UserOption[];
  defaultDate?: string;
}

const INPUT_CLASS =
  "w-full rounded-xl bg-brand-moss-800/60 px-4 py-3 text-brand-cream-100 placeholder-brand-cream-600 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 min-h-[48px] appearance-none";
const LABEL_CLASS =
  "mb-1.5 block text-sm font-medium text-brand-cream-300";

// Group users by role for display
const ROLE_ORDER: Role[] = [
  "CAPTAIN",
  "DECKHAND",
  "MECHANIC",
  "HOSPITALITY",
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

  const initialAssigned = new Set(
    event?.shifts.map((s) => s.userId) ?? []
  );
  const [assigned, setAssigned] = useState<Set<string>>(initialAssigned);

  function toggleUser(userId: string) {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
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

      // Save crew assignments
      await setEventCrew(result.eventId, Array.from(assigned));
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
            defaultValue={
              event?.startTime ? toTimeInputValue(event.startTime) : "09:00"
            }
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
            defaultValue={
              event?.endTime ? toTimeInputValue(event.endTime) : "17:00"
            }
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
              <div className="flex flex-wrap gap-2">
                {users.map((u) => {
                  const on = assigned.has(u.id);
                  return (
                    <button
                      key={u.id}
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
