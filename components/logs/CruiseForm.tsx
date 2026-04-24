"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCruiseEntry } from "@/app/cruise-log/actions";
import { CRUISE } from "@/lib/monday-schema";
import { TextField, SelectField, TextareaField } from "./FormField";
import { SubmitButton } from "./SubmitButton";

interface CruiseFormProps {
  defaultCaptain: string;
  defaultDate: string;
}

export function CruiseForm({ defaultCaptain, defaultDate }: CruiseFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(fd: FormData) {
    setFormError(null);
    try {
      const result = await createCruiseEntry(fd);
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      router.push("/cruise-log");
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
          type="time"
          required
        />
        <TextField
          name="returnTime"
          label="Return Docked Time"
          type="time"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField name="weather" label="Weather" placeholder="e.g. Sunny, 75°" required />
        <TextField name="wind" label="Wind" placeholder="e.g. 10/15 S" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField name="guests" label="Guests onboard" type="number" placeholder="0" required />
        <TextField name="crewCount" label="# of crew" type="number" placeholder="0" required />
      </div>

      <TextareaField name="notes" label="Notes" rows={4} />

      <SubmitButton label="Save Cruise Entry" />
    </form>
  );
}
