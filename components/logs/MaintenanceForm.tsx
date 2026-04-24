"use client";

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
  return (
    <form action={createMaintenanceEntry} className="space-y-5">
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
