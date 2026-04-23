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

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-brand-moss-400/50 bg-brand-moss-900/60 px-3 py-2 text-base text-brand-cream-100 placeholder:text-brand-cream-600 shadow-sm focus:border-brand-brass-400 focus:outline-none focus:ring-2 focus:ring-brand-brass-400/30";

const LABEL_CLASS =
  "block text-sm font-medium text-brand-cream-300";

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
    <form id="user-form" action={handleSubmit} className="space-y-4">
      {mode === "edit" && user && (
        <input type="hidden" name="id" value={user.id} />
      )}

      <div>
        <label htmlFor="name" className={LABEL_CLASS}>
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={user?.name ?? ""}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="phone" className={LABEL_CLASS}>
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
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-xs text-brand-cream-500">
          Any format. Non-digits are stripped. PIN is always the last 4 digits.
        </p>
      </div>

      <div>
        <label htmlFor="role" className={LABEL_CLASS}>
          Role
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue={user?.role ?? ""}
          className={INPUT_CLASS}
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
          className="rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-200 ring-1 ring-red-400/40"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-lg bg-emerald-900/40 px-3 py-2 text-sm text-emerald-100 ring-1 ring-emerald-400/40"
        >
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-touch items-center justify-center rounded-full bg-brand-brass-400 px-6 py-2.5 text-sm font-semibold text-brand-moss-800 shadow-sm transition hover:bg-brand-brass-300 disabled:opacity-50"
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
