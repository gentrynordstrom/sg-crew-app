"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransactionEntry } from "@/app/transactions/actions";
import { TRANSACTIONS } from "@/lib/monday-schema";
import { uploadFilesToMonday } from "@/lib/upload-file";
import { TextField, SelectField, TextareaField } from "./FormField";
import { AttachmentPicker } from "./AttachmentPicker";
import { SubmitButton } from "./SubmitButton";

interface TransactionFormProps {
  defaultDate: string;
  defaultPerson: string;
}

export function TransactionForm({ defaultDate, defaultPerson }: TransactionFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  async function handleSubmit(fd: FormData) {
    setFormError(null);
    setUploadWarning(null);
    try {
      const receipts = fd.getAll("receipts") as File[];
      fd.delete("receipts");

      const result = await createTransactionEntry(fd);
      if ("error" in result) { setFormError(result.error); return; }

      const validReceipts = receipts.filter((f) => f.size > 0);
      if (validReceipts.length > 0) {
        const errs = await uploadFilesToMonday(result.itemId, TRANSACTIONS.columns.receipts.id, validReceipts);
        if (errs.length > 0) {
          const detail = errs[0]?.slice(0, 280) ?? "";
          setUploadWarning(
            `Entry saved, but ${errs.length} file(s) could not be attached.${detail ? ` ${detail}` : ""}`
          );
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      router.push("/transactions");
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
      <TextField
        name="date"
        label="Date"
        type="date"
        defaultValue={defaultDate}
        required
      />

      <TextField
        name="transactionName"
        label="Transaction Name"
        placeholder="e.g. Aldi grocery run"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          name="transactionType"
          label="Type"
          options={TRANSACTIONS.columns.transactionType.labels}
          required
        />
        <SelectField
          name="currency"
          label="Payment Method"
          options={TRANSACTIONS.columns.currency.labels}
          required
        />
      </div>

      <SelectField
        name="category"
        label="Category"
        options={TRANSACTIONS.columns.category.labels}
        required
      />

      <TextField
        name="payeePayer"
        label="Payee / Payer"
        placeholder="Who was paid or who paid"
      />

      <SelectField
        name="person"
        label="Person (who handled it)"
        options={TRANSACTIONS.columns.person.labels}
        defaultValue={defaultPerson}
        required
      />

      <TextareaField
        name="notes"
        label="Notes"
        rows={3}
        placeholder="Check numbers, details, etc."
      />

      <AttachmentPicker
        name="receipts"
        label="Receipts"
        multiple
        accept="image/*,application/pdf"
      />

      <SubmitButton label="Save Transaction" />
    </form>
  );
}
