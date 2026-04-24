"use client";

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
  return (
    <form action={createTransactionEntry} className="space-y-5">
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
