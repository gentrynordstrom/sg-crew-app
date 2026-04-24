"use client";

import { createCruiseEntry } from "@/app/cruise-log/actions";
import { CRUISE } from "@/lib/monday-schema";
import { TextField, SelectField, TextareaField } from "./FormField";
import { SubmitButton } from "./SubmitButton";

interface CruiseFormProps {
  defaultCaptain: string;
  defaultDate: string;
}

export function CruiseForm({ defaultCaptain, defaultDate }: CruiseFormProps) {
  return (
    <form action={createCruiseEntry} className="space-y-5">
      <TextField
        name="date"
        label="Date"
        type="date"
        defaultValue={defaultDate}
        required
      />

      <SelectField
        name="outcome"
        label="Outcome"
        options={CRUISE.columns.outcome.labels}
        defaultValue="Planned"
        required
      />

      <SelectField
        name="cruiseType"
        label="Cruise Type"
        options={CRUISE.columns.cruiseType.labels}
        required
      />

      <SelectField
        name="captain"
        label="Captain"
        options={CRUISE.columns.captain.labels}
        defaultValue={defaultCaptain}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="departureTime"
          label="Departure Time"
          placeholder="e.g. 6:30 PM"
        />
        <TextField
          name="returnTime"
          label="Return Docked Time"
          placeholder="e.g. 9:00 PM"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField name="weather" label="Weather" placeholder="e.g. Sunny, 75°" />
        <TextField name="wind" label="Wind" placeholder="e.g. 10/15 S" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField name="guests" label="Guests onboard" type="number" placeholder="0" />
        <TextField name="crewCount" label="# of crew" type="number" placeholder="0" />
      </div>

      <TextareaField name="notes" label="Notes" rows={4} />

      <SubmitButton label="Save Cruise Entry" />
    </form>
  );
}
