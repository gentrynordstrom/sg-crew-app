"use server";

import { revalidatePath } from "next/cache";
import { requireActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/**
 * Utility: fetch the caller's single open (not-clocked-out) entry, if any.
 * "Open" here means the shift is still in progress, i.e. clockOutAt is null.
 * The DB-level status enum is a separate concept (OPEN vs LOCKED).
 */
async function findActiveShift(userId: string) {
  return prisma.timeEntry.findFirst({
    where: { userId, clockOutAt: null },
    orderBy: { clockInAt: "desc" },
  });
}

export async function clockIn(): Promise<ActionResult> {
  const user = await requireActiveSession();

  const active = await findActiveShift(user.id);
  if (active) {
    return { ok: false, error: "You're already clocked in." };
  }

  await prisma.timeEntry.create({
    data: {
      userId: user.id,
      clockInAt: new Date(),
    },
  });

  revalidatePath("/time");
  return { ok: true, message: "Clocked in." };
}

export async function startBreak(): Promise<ActionResult> {
  const user = await requireActiveSession();

  const active = await findActiveShift(user.id);
  if (!active) {
    return { ok: false, error: "You're not clocked in." };
  }
  if (active.breakStartAt && !active.breakEndAt) {
    return { ok: false, error: "You're already on break." };
  }
  if (active.breakStartAt && active.breakEndAt) {
    return {
      ok: false,
      error: "You already took your break this shift.",
    };
  }

  await prisma.timeEntry.update({
    where: { id: active.id },
    data: { breakStartAt: new Date() },
  });

  revalidatePath("/time");
  return { ok: true, message: "Break started." };
}

export async function endBreak(): Promise<ActionResult> {
  const user = await requireActiveSession();

  const active = await findActiveShift(user.id);
  if (!active) {
    return { ok: false, error: "You're not clocked in." };
  }
  if (!active.breakStartAt || active.breakEndAt) {
    return { ok: false, error: "You're not on break." };
  }

  await prisma.timeEntry.update({
    where: { id: active.id },
    data: { breakEndAt: new Date() },
  });

  revalidatePath("/time");
  return { ok: true, message: "Back from break." };
}

export async function clockOut(): Promise<ActionResult> {
  const user = await requireActiveSession();

  const active = await findActiveShift(user.id);
  if (!active) {
    return { ok: false, error: "You're not clocked in." };
  }

  const now = new Date();
  await prisma.timeEntry.update({
    where: { id: active.id },
    data: {
      clockOutAt: now,
      // If they forgot to end their break, close it out now.
      breakEndAt:
        active.breakStartAt && !active.breakEndAt ? now : active.breakEndAt,
    },
  });

  revalidatePath("/time");
  return { ok: true, message: "Clocked out." };
}

interface UpdateMyEntryInput {
  id: string;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  breakStartAt: Date | null;
  breakEndAt: Date | null;
  note: string | null;
}

/**
 * Self-edit of a completed shift. Rules:
 *   - Entry must belong to the caller
 *   - Entry.status must be OPEN (not LOCKED)
 *   - clockInAt is required
 *   - If either break time is set, both must be set and breakEnd > breakStart
 *   - If clockOutAt is set, it must be > clockInAt
 *
 * Crew cannot edit an IN-PROGRESS shift (clockOutAt IS NULL) — they use the
 * clock-in/out buttons for that. Edits only make sense post-shift.
 */
export async function updateMyEntry(
  input: UpdateMyEntryInput
): Promise<ActionResult> {
  const user = await requireActiveSession();

  const existing = await prisma.timeEntry.findUnique({
    where: { id: input.id },
  });
  if (!existing) return { ok: false, error: "Entry not found." };
  if (existing.userId !== user.id) {
    return { ok: false, error: "You can only edit your own timesheet." };
  }
  if (existing.status === "LOCKED") {
    return {
      ok: false,
      error: "This entry is locked. Ask an admin if you need a correction.",
    };
  }
  if (!existing.clockOutAt) {
    return {
      ok: false,
      error: "Clock out first before editing this shift.",
    };
  }

  if (!input.clockInAt) {
    return { ok: false, error: "Clock-in time is required." };
  }
  if (!input.clockOutAt) {
    return { ok: false, error: "Clock-out time is required." };
  }
  if (input.clockOutAt.getTime() <= input.clockInAt.getTime()) {
    return { ok: false, error: "Clock-out must be after clock-in." };
  }

  const hasBreakStart = !!input.breakStartAt;
  const hasBreakEnd = !!input.breakEndAt;
  if (hasBreakStart !== hasBreakEnd) {
    return {
      ok: false,
      error: "Fill in both break start and break end (or neither).",
    };
  }
  if (input.breakStartAt && input.breakEndAt) {
    if (input.breakEndAt.getTime() <= input.breakStartAt.getTime()) {
      return { ok: false, error: "Break end must be after break start." };
    }
    if (
      input.breakStartAt.getTime() < input.clockInAt.getTime() ||
      input.breakEndAt.getTime() > input.clockOutAt.getTime()
    ) {
      return { ok: false, error: "Break must fall within the shift." };
    }
  }

  await prisma.timeEntry.update({
    where: { id: input.id },
    data: {
      clockInAt: input.clockInAt,
      clockOutAt: input.clockOutAt,
      breakStartAt: input.breakStartAt,
      breakEndAt: input.breakEndAt,
      note: input.note?.trim() ? input.note.trim() : null,
    },
  });

  revalidatePath("/time");
  return { ok: true, message: "Saved." };
}
