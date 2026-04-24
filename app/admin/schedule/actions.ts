"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ScheduledEventType, ScheduledEventStatus } from "@prisma/client";
import { combineDateAndTime } from "@/lib/schedule";

export type ScheduleActionResult =
  | { ok: true; eventId: string }
  | { ok: false; error: string };

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createEvent(
  fd: FormData
): Promise<ScheduleActionResult> {
  const admin = await requireAdmin();

  const title = (fd.get("title") as string)?.trim();
  const date = fd.get("date") as string;
  const startTimeRaw = fd.get("startTime") as string;
  const endTimeRaw = fd.get("endTime") as string;
  const eventType = fd.get("eventType") as ScheduledEventType;
  const status = (fd.get("status") as ScheduledEventStatus) ?? "DRAFT";
  const notes = ((fd.get("notes") as string) ?? "").trim() || null;

  if (!title) return { ok: false, error: "Title is required." };
  if (!date) return { ok: false, error: "Date is required." };
  if (!startTimeRaw || !endTimeRaw)
    return { ok: false, error: "Start and end times are required." };

  const startTime = combineDateAndTime(date, startTimeRaw);
  const endTime = combineDateAndTime(date, endTimeRaw);

  if (endTime <= startTime)
    return { ok: false, error: "End time must be after start time." };

  const event = await prisma.scheduledEvent.create({
    data: {
      title,
      date: new Date(date + "T00:00:00Z"),
      startTime,
      endTime,
      eventType,
      status,
      notes,
      createdById: admin.id,
    },
  });

  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  return { ok: true, eventId: event.id };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateEvent(
  fd: FormData
): Promise<ScheduleActionResult> {
  await requireAdmin();

  const id = fd.get("id") as string;
  const title = (fd.get("title") as string)?.trim();
  const date = fd.get("date") as string;
  const startTimeRaw = fd.get("startTime") as string;
  const endTimeRaw = fd.get("endTime") as string;
  const eventType = fd.get("eventType") as ScheduledEventType;
  const status = fd.get("status") as ScheduledEventStatus;
  const notes = ((fd.get("notes") as string) ?? "").trim() || null;

  if (!id) return { ok: false, error: "Event ID is required." };
  if (!title) return { ok: false, error: "Title is required." };
  if (!date) return { ok: false, error: "Date is required." };

  const startTime = combineDateAndTime(date, startTimeRaw);
  const endTime = combineDateAndTime(date, endTimeRaw);

  if (endTime <= startTime)
    return { ok: false, error: "End time must be after start time." };

  await prisma.scheduledEvent.update({
    where: { id },
    data: { title, date: new Date(date + "T00:00:00Z"), startTime, endTime, eventType, status, notes },
  });

  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  return { ok: true, eventId: id };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteEvent(
  eventId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  await prisma.scheduledEvent.delete({ where: { id: eventId } });
  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  return { ok: true };
}

// ─── Crew assignment ──────────────────────────────────────────────────────────

/**
 * Replace all crew assignments for an event with the provided userIds.
 * Accepts an empty array to remove everyone.
 */
export async function setEventCrew(
  eventId: string,
  userIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  // Remove all existing assignments then insert the new ones
  await prisma.scheduledShift.deleteMany({ where: { eventId } });

  if (userIds.length > 0) {
    await prisma.scheduledShift.createMany({
      data: userIds.map((userId) => ({ eventId, userId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  return { ok: true };
}

// ─── Publish week ─────────────────────────────────────────────────────────────

/**
 * Flip all DRAFT events in a given week from DRAFT → PUBLISHED.
 */
export async function publishWeek(
  monday: string
): Promise<{ ok: boolean; count?: number; error?: string }> {
  await requireAdmin();

  const [y, m, d] = monday.split("-").map(Number);
  const weekStart = new Date(Date.UTC(y, m - 1, d));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  const result = await prisma.scheduledEvent.updateMany({
    where: {
      date: { gte: weekStart, lt: weekEnd },
      status: "DRAFT",
    },
    data: { status: "PUBLISHED" },
  });

  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  return { ok: true, count: result.count };
}
