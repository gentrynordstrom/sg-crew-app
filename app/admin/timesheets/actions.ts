"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { endOfPayrollDay, startOfPayrollDay } from "@/lib/time";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

interface EditEntryInput {
  id: string;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  breakStartAt: Date | null;
  breakEndAt: Date | null;
  note: string | null;
}

/**
 * Admin edit of any non-LOCKED entry. Validation mirrors the crew self-edit
 * path but without the ownership / clock-out-first checks — admin can also
 * fix in-progress shifts (set clockOutAt for somebody who forgot).
 */
export async function editEntry(
  input: EditEntryInput
): Promise<ActionResult> {
  await requireAdmin();

  const existing = await prisma.timeEntry.findUnique({
    where: { id: input.id },
  });
  if (!existing) return { ok: false, error: "Entry not found." };
  if (existing.status === "LOCKED") {
    return {
      ok: false,
      error: "Unlock the pay period before editing a locked entry.",
    };
  }

  if (!input.clockInAt) {
    return { ok: false, error: "Clock-in time is required." };
  }
  if (input.clockOutAt && input.clockOutAt <= input.clockInAt) {
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
    if (input.breakEndAt <= input.breakStartAt) {
      return { ok: false, error: "Break end must be after break start." };
    }
    if (input.breakStartAt < input.clockInAt) {
      return { ok: false, error: "Break cannot start before clock-in." };
    }
    if (input.clockOutAt && input.breakEndAt > input.clockOutAt) {
      return { ok: false, error: "Break cannot end after clock-out." };
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

  revalidatePath("/admin/timesheets");
  return { ok: true, message: "Entry updated." };
}

export async function deleteEntry(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = (formData.get("id") ?? "").toString();
  if (!id) return { ok: false, error: "Missing entry id." };

  const existing = await prisma.timeEntry.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Entry not found." };
  if (existing.status === "LOCKED") {
    return {
      ok: false,
      error: "Unlock the pay period before deleting a locked entry.",
    };
  }

  await prisma.timeEntry.delete({ where: { id } });

  revalidatePath("/admin/timesheets");
  return { ok: true, message: "Entry deleted." };
}

export async function lockRange(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const from = (formData.get("from") ?? "").toString();
  const to = (formData.get("to") ?? "").toString();
  if (!from || !to) {
    return { ok: false, error: "Missing date range." };
  }

  const start = startOfPayrollDay(from);
  const end = endOfPayrollDay(to);

  const result = await prisma.timeEntry.updateMany({
    where: {
      status: "OPEN",
      // Only lock completed shifts — never lock an in-progress one.
      clockOutAt: { not: null },
      clockInAt: { gte: start, lte: end },
    },
    data: {
      status: "LOCKED",
      lockedAt: new Date(),
      lockedById: admin.id,
    },
  });

  revalidatePath("/admin/timesheets");
  return {
    ok: true,
    message: `Locked ${result.count} ${
      result.count === 1 ? "entry" : "entries"
    }.`,
  };
}

export async function unlockRange(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const from = (formData.get("from") ?? "").toString();
  const to = (formData.get("to") ?? "").toString();
  if (!from || !to) {
    return { ok: false, error: "Missing date range." };
  }

  const start = startOfPayrollDay(from);
  const end = endOfPayrollDay(to);

  const result = await prisma.timeEntry.updateMany({
    where: {
      status: "LOCKED",
      clockInAt: { gte: start, lte: end },
    },
    data: {
      status: "OPEN",
      lockedAt: null,
      lockedById: null,
    },
  });

  revalidatePath("/admin/timesheets");
  return {
    ok: true,
    message: `Unlocked ${result.count} ${
      result.count === 1 ? "entry" : "entries"
    }.`,
  };
}
