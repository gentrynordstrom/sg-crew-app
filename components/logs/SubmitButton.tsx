"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  label?: string;
  pendingLabel?: string;
}

export function SubmitButton({
  label = "Save",
  pendingLabel = "Saving…",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand-brass-500 py-4 text-base font-semibold text-brand-moss-900 transition hover:bg-brand-brass-400 active:scale-[0.97] disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
