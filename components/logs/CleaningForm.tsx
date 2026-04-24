"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCleaningEntry } from "@/app/cleaning-log/actions";
import { CLEANING } from "@/lib/monday-schema";
import { TextField, SelectField, TextareaField } from "./FormField";
import { AttachmentPicker } from "./AttachmentPicker";
import { SubmitButton } from "./SubmitButton";

interface CleaningFormProps {
  defaultDate: string;
  crewName: string;
}

export function CleaningForm({ defaultDate, crewName }: CleaningFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(fd: FormData) {
    setFormError(null);
    try {
      const result = await createCleaningEntry(fd);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      router.push("/cleaning-log");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="rounded-xl bg-brand-moss-800/40 px-4 py-3 text-sm text-brand-cream-400">
        Crew member: <span className="font-semibold text-brand-cream-200">{crewName}</span>
      </div>

      {formError && (
        <div className="rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {formError}
        </div>
      )}

      <TextField
        name="date"
        label="Date"
        type="date"
        defaultValue={defaultDate}
        required
      />

      <SelectField
        name="cleaningType"
        label="Cleaning Type"
        options={CLEANING.columns.cleaningType.labels}
        required
      />

      <SelectField
        name="maintenanceNeeded"
        label="Maintenance Needed?"
        options={CLEANING.columns.maintenanceNeeded.labels}
        defaultValue="No"
        required
      />

      <TextareaField name="notes" label="Notes" rows={3} />

      <AttachmentPicker
        name="photos"
        label="After Pictures"
        multiple
      />

      <SubmitButton label="Save Cleaning Entry" />
    </form>
  );
}
