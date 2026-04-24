"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMaintenanceEntry } from "@/app/maintenance-log/actions";
import { MAINTENANCE } from "@/lib/monday-schema";
import { TextField, SelectField, TextareaField } from "./FormField";
import { AttachmentPicker } from "./AttachmentPicker";
import { SubmitButton } from "./SubmitButton";

interface MaintenanceFormProps {
  defaultDate: string;
  crewName: string;
}

export function MaintenanceForm({ defaultDate, crewName }: MaintenanceFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(fd: FormData) {
    setFormError(null);
    try {
      const result = await createMaintenanceEntry(fd);
      if (result?.error) { setFormError(result.error); return; }
      router.push("/maintenance-log");
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
        name="maintenanceType"
        label="Maintenance Type"
        options={MAINTENANCE.columns.maintenanceType.labels}
        required
      />

      <SelectField
        name="resolved"
        label="Resolved?"
        options={MAINTENANCE.columns.resolved.labels}
        defaultValue="Not Yet"
        required
      />

      <TextareaField name="notes" label="Notes / Description" rows={4} />

      <AttachmentPicker
        name="beforePhotos"
        label="Before Pictures"
        multiple
        capture="environment"
      />

      <AttachmentPicker
        name="afterPhotos"
        label="After Pictures"
        multiple
        capture="environment"
      />

      <SubmitButton label="Save Maintenance Entry" />
    </form>
  );
}
