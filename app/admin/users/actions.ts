"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { derivePinFromPhone, isValidPhone, normalizePhone } from "@/lib/phone";

const VALID_ROLES: Role[] = [
  "CAPTAIN",
  "DECKHAND",
  "MECHANIC",
  "HOSPITALITY",
  "ADMIN",
];

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function parseRole(raw: FormDataEntryValue | null): Role | null {
  if (typeof raw !== "string") return null;
  return (VALID_ROLES as string[]).includes(raw) ? (raw as Role) : null;
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const name = (formData.get("name") ?? "").toString().trim();
  const phoneRaw = (formData.get("phone") ?? "").toString();
  const role = parseRole(formData.get("role"));

  if (!name) return { ok: false, error: "Name is required." };
  if (!role) return { ok: false, error: "Role is required." };

  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) {
    return {
      ok: false,
      error: "Phone must be 10 digits (any format accepted).",
    };
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return { ok: false, error: "A user with that phone already exists." };
  }

  const pin = derivePinFromPhone(phone);
  const pinHash = await bcrypt.hash(pin, 10);
  const paychexId = ((formData.get("paychexId") ?? "") as string).trim() || null;

  await prisma.user.create({
    data: { name, phone, role, pinHash, isActive: true, paychexId },
  });

  revalidatePath("/admin/users");
  return { ok: true, message: `Created ${name}. PIN is last 4 of phone.` };
}

export async function updateUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = (formData.get("id") ?? "").toString();
  if (!id) return { ok: false, error: "Missing user id." };

  const name = (formData.get("name") ?? "").toString().trim();
  const phoneRaw = (formData.get("phone") ?? "").toString();
  const role = parseRole(formData.get("role"));

  if (!name) return { ok: false, error: "Name is required." };
  if (!role) return { ok: false, error: "Role is required." };

  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) {
    return {
      ok: false,
      error: "Phone must be 10 digits (any format accepted).",
    };
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "User not found." };

  const phoneTaken = await prisma.user.findFirst({
    where: { phone, NOT: { id } },
    select: { id: true },
  });
  if (phoneTaken) {
    return { ok: false, error: "Another user already has that phone." };
  }

  const phoneChanged = existing.phone !== phone;
  const paychexId = ((formData.get("paychexId") ?? "") as string).trim() || null;
  const data: {
    name: string;
    phone: string;
    role: Role;
    paychexId: string | null;
    pinHash?: string;
    failedAttempts?: number;
    lockedUntil?: null;
  } = { name, phone, role, paychexId };

  if (phoneChanged) {
    const newPin = derivePinFromPhone(phone);
    data.pinHash = await bcrypt.hash(newPin, 10);
    data.failedAttempts = 0;
    data.lockedUntil = null;
  }

  await prisma.user.update({ where: { id }, data });

  revalidatePath("/admin/users");
  return {
    ok: true,
    message: phoneChanged
      ? `Updated ${name}. PIN reset to last 4 of new phone.`
      : `Updated ${name}.`,
  };
}

export async function toggleActive(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const id = (formData.get("id") ?? "").toString();
  if (!id) return { ok: false, error: "Missing user id." };

  if (id === admin.id) {
    return { ok: false, error: "You cannot deactivate your own account." };
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "User not found." };

  await prisma.user.update({
    where: { id },
    data: {
      isActive: !existing.isActive,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  revalidatePath("/admin/users");
  return {
    ok: true,
    message: existing.isActive
      ? `Deactivated ${existing.name}.`
      : `Reactivated ${existing.name}.`,
  };
}

export async function unlockUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = (formData.get("id") ?? "").toString();
  if (!id) return { ok: false, error: "Missing user id." };

  await prisma.user.update({
    where: { id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  revalidatePath("/admin/users");
  return { ok: true, message: "User unlocked." };
}
