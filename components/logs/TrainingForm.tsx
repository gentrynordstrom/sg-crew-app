"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrainingEntry } from "@/app/training-log/actions";
import { TRAINING } from "@/lib/monday-schema";
import { uploadFilesToMonday } from "@/lib/upload-file";
import { TextField, SelectField } from "./FormField";
import { AttachmentPicker } from "./AttachmentPicker";
import { SubmitButton } from "./SubmitButton";

interface TrainingFormProps {
  defaultDate: string;
  crewName: string;
  trainingTypeOptions: string[];
  trainingTypeLoadError: string | null;
}

export function TrainingForm({
  defaultDate,
  crewName,
  trainingTypeOptions,
  trainingTypeLoadError,
}: TrainingFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const canSubmit = trainingTypeOptions.length > 0 && !trainingTypeLoadError;

  async function handleSubmit(fd: FormData) {
    setFormError(null);
    setUploadWarning(null);
    try {
      const attachments = fd.getAll("attachments") as File[];
      fd.delete("attachments");

      const result = await createTrainingEntry(fd);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }

      const validFiles = attachments.filter((f) => f.size > 0);
      if (validFiles.length > 0) {
        const errs = await uploadFilesToMonday(
          result.itemId,
          TRAINING.columns.attachments.id,
          validFiles
        );
        if (errs.length > 0) {
          const detail = errs[0]?.slice(0, 280) ?? "";
          setUploadWarning(
            `Entry saved, but ${errs.length} file(s) could not be attached.${detail ? ` ${detail}` : ""}`
          );
          await new Promise((r) => setTimeout(r, 3000));
        }
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
      {uploadWarning && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
          {uploadWarning}
        </div>
      )}
      {trainingTypeLoadError && (
        <div className="rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {trainingTypeLoadError}
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

      <SelectField
        name="trainingType"
        label="Training type"
        options={trainingTypeOptions}
        required={canSubmit}
        hint={canSubmit ? undefined : "Fix the Monday board or connection, then reload this page."}
      />

      <TextField
        name="title"
        label="Training Title"
        placeholder="Example: Man Overboard Drill"
        required
      />

      <AttachmentPicker
        name="attachments"
        label="Attachments (optional)"
        multiple
        accept="image/*,application/pdf"
      />

      <SubmitButton label="Save Training Entry" disabled={!canSubmit} />
    </form>
  );
}
