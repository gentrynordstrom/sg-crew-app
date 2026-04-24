"use client";

import { logPatioHandoff } from "@/app/drawer-close/actions";
import { SubmitButton } from "./SubmitButton";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PatioHandoffFormProps {
  defaultDate: string;
  otherUsers: { id: string; name: string }[];
}

export function PatioHandoffForm({ defaultDate, otherUsers }: PatioHandoffFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(fd: FormData) {
    try {
      await logPatioHandoff(fd);
      router.push("/drawer-close");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <p className="text-sm text-brand-cream-400">
        Log the cash you&apos;re transferring from the Main Bar float to open the Patio Bar.
      </p>

      {error && (
        <div className="rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="shiftDate" className="mb-1.5 block text-sm font-medium text-brand-cream-300">
          Shift Date <span className="ml-1 text-brand-brass-400">*</span>
        </label>
        <input
          id="shiftDate"
          name="shiftDate"
          type="date"
          defaultValue={defaultDate}
          required
          className="w-full rounded-xl bg-brand-moss-800/60 px-4 py-3 text-brand-cream-100 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 min-h-[48px]"
        />
      </div>

      <div>
        <label htmlFor="patioBartenderId" className="mb-1.5 block text-sm font-medium text-brand-cream-300">
          Patio Bartender <span className="ml-1 text-brand-brass-400">*</span>
        </label>
        <select
          id="patioBartenderId"
          name="patioBartenderId"
          required
          defaultValue=""
          className="w-full appearance-none rounded-xl bg-brand-moss-800/60 px-4 py-3 text-brand-cream-100 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 min-h-[48px]"
        >
          <option value="" disabled>Select bartender…</option>
          {otherUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-brand-cream-300">
          Amount to Transfer <span className="ml-1 text-brand-brass-400">*</span>
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-brand-cream-500">$</span>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="1"
            required
            placeholder="0.00"
            className="w-full rounded-xl bg-brand-moss-800/60 py-3 pl-7 pr-4 text-brand-cream-100 placeholder-brand-cream-600 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 min-h-[48px]"
          />
        </div>
      </div>

      <SubmitButton label="Log Handoff" pendingLabel="Saving…" />
    </form>
  );
}
