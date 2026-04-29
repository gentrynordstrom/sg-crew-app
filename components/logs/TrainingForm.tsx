"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrainingEntry } from "@/app/training-log/actions";
import { TextField } from "./FormField";
import { SubmitButton } from "./SubmitButton";

interface TrainingFormProps {
  defaultDate: string;
  crewName: string;
}

export function TrainingForm({ defaultDate, crewName }: TrainingFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(fd: FormData) {
    setFormError(null);
    try {
      const result = await createTrainingEntry(fd);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      router.push("/training-log");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {formError && (
        <div className="rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {formError}
        </div>
      )}

      <div className="rounded-xl bg-brand-moss-800/40 px-4 py-3 text-sm text-brand-cream-400">
        Submitted by: <span className="font-semibold text-brand-cream-200">{crewName}</span>
      </div>

      <TextField
        name="date"
        label="Date"
        type="date"
        defaultValue={defaultDate}
      />

      <TextField
        name="title"
        label="Training Title"
        placeholder="Example: Man Overboard Drill"
        required
      />

      <SubmitButton label="Save Training Entry" />
    </form>
  );
}
