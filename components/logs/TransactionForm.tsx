"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransactionEntry } from "@/app/transactions/actions";
import { TRANSACTIONS } from "@/lib/monday-schema";
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

  async function handleSubmit(fd: FormData) {
    setFormError(null);
    try {
      const result = await createTransactionEntry(fd);
      if (result?.error) { setFormError(result.error); return; }
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
        capture="environment"
      />

      <SubmitButton label="Save Transaction" />
    </form>
  );
}
