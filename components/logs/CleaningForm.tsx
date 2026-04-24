"use client";

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
  return (
    <form action={createCleaningEntry} className="space-y-5">
      <div className="rounded-xl bg-brand-moss-800/40 px-4 py-3 text-sm text-brand-cream-400">
        Crew member: <span className="font-semibold text-brand-cream-200">{crewName}</span>
      </div>

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
        capture="environment"
      />

      <SubmitButton label="Save Cleaning Entry" />
    </form>
  );
}
