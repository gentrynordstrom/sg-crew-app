"use client";

import { useState, useTransition } from "react";
import type { Role, User } from "@prisma/client";
import {
  createUser,
  updateUser,
  type ActionResult,
} from "@/app/admin/users/actions";

interface UserFormProps {
  mode: "create" | "edit";
  user?: Pick<User, "id" | "name" | "phone" | "role">;
  onDone?: () => void;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "CAPTAIN", label: "Captain" },
  { value: "DECKHAND", label: "Deckhand" },
  { value: "MECHANIC", label: "Mechanic" },
  { value: "ADMIN", label: "Admin" },
];

export function UserForm({ mode, user, onDone }: UserFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result: ActionResult =
        mode === "create"
          ? await createUser(formData)
          : await updateUser(formData);

      if (!result.ok) {
        setError(result.error);
      } else {
        setSuccess(result.message ?? "Saved.");
        if (mode === "create") {
          const form = document.getElementById(
            "user-form"
          ) as HTMLFormElement | null;
          form?.reset();
        }
        onDone?.();
      }
    });
  }

  return (
    <form
      id="user-form"
      action={handleSubmit}
      className="space-y-4"
    >
      {mode === "edit" && user && (
        <input type="hidden" name="id" value={user.id} />
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-700"
        >
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={user?.name ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base shadow-sm focus:border-brand-sea focus:outline-none focus:ring-2 focus:ring-brand-sea/30"
        />
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-slate-700"
        >
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          placeholder="(555) 555-5555"
          defaultValue={user?.phone ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base shadow-sm focus:border-brand-sea focus:outline-none focus:ring-2 focus:ring-brand-sea/30"
        />
        <p className="mt-1 text-xs text-slate-500">
          Any format. Non-digits are stripped. PIN is always the last 4 digits.
        </p>
      </div>

      <div>
        <label
          htmlFor="role"
          className="block text-sm font-medium text-slate-700"
        >
          Role
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue={user?.role ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base shadow-sm focus:border-brand-sea focus:outline-none focus:ring-2 focus:ring-brand-sea/30"
        >
          <option value="" disabled>
            Select a role
          </option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200"
        >
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-touch items-center justify-center rounded-full bg-brand-navy px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-sea disabled:opacity-50"
      >
        {isPending
          ? "Saving…"
          : mode === "create"
          ? "Create user"
          : "Save changes"}
      </button>
    </form>
  );
}
