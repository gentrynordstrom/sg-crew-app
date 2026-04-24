"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDepositEntry } from "@/app/drawer-close/actions";
import { DRAWER_CLOSE } from "@/lib/monday-schema";
import { uploadFileToMonday } from "@/lib/upload-file";
import { TextareaField } from "./FormField";
import { AttachmentPicker } from "./AttachmentPicker";
import { SubmitButton } from "./SubmitButton";

interface DrawerDepositFormProps {
  itemId: string;
  toDeposit: number;
  defaultDate: string;
  defaultDepositedBy: string;
}

function fmt(n: number): string {
  return `$${Math.abs(n).toFixed(2)}`;
}

export function DrawerDepositForm({
  itemId,
  toDeposit,
  defaultDate,
  defaultDepositedBy,
}: DrawerDepositFormProps) {
  const router = useRouter();
  const [deposited, setDeposited] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const depositedAmt = parseFloat(deposited) || 0;
  const depositVariance = depositedAmt - toDeposit;
  const hasVariance = deposited && Math.abs(depositVariance) >= 0.01;

  const varianceColor = depositVariance < 0 ? "text-red-400" : "text-amber-300";

  async function handleSubmit(fd: FormData) {
    setFormError(null);
    setUploadWarning(null);
    try {
      const bankPhoto = fd.get("bankReceiptPhoto") as File | null;
      fd.delete("bankReceiptPhoto");

      const result = await createDepositEntry(itemId, fd);
      if ("error" in result) { setFormError(result.error); return; }

      if (bankPhoto && bankPhoto.size > 0) {
        const err = await uploadFileToMonday(result.itemId, DRAWER_CLOSE.columns.bankReceiptPhoto.id, bankPhoto);
        if (err) {
          setUploadWarning("Deposit saved, but the receipt photo could not be attached.");
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      router.push("/drawer-close");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <input type="hidden" name="toDeposit" value={toDeposit} />

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

      {/* To Deposit (read-only) */}
      <div className="rounded-xl bg-brand-moss-800/60 px-4 py-3 ring-1 ring-brand-brass-500/30">
        <p className="text-sm text-brand-cream-400">Amount to Deposit</p>
        <p className="text-2xl font-bold text-brand-brass-300">{fmt(toDeposit)}</p>
      </div>

      {/* Date */}
      <div>
        <label htmlFor="depositDate" className="mb-1.5 block text-sm font-medium text-brand-cream-300">
          Deposit Date <span className="ml-1 text-brand-brass-400">*</span>
        </label>
        <input
          id="depositDate"
          name="depositDate"
          type="date"
          defaultValue={defaultDate}
          required
          className="w-full rounded-xl bg-brand-moss-800/60 px-4 py-3 text-brand-cream-100 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 min-h-[48px]"
        />
      </div>

      {/* Deposited amount */}
      <div>
        <label htmlFor="deposited" className="mb-1.5 block text-sm font-medium text-brand-cream-300">
          Amount Deposited <span className="ml-1 text-brand-brass-400">*</span>
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-brand-cream-500">$</span>
          <input
            id="deposited"
            name="deposited"
            type="number"
            step="0.01"
            min="0"
            value={deposited}
            onChange={(e) => setDeposited(e.target.value)}
            required
            placeholder={toDeposit.toFixed(2)}
            className="w-full rounded-xl bg-brand-moss-800/60 py-3 pl-7 pr-4 text-brand-cream-100 placeholder-brand-cream-600 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 min-h-[48px]"
          />
        </div>
      </div>

      {/* Live deposit variance */}
      {hasVariance && (
        <div className={`rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${depositVariance < 0 ? "bg-red-900/20 ring-red-700/30 text-red-300" : "bg-amber-900/20 ring-amber-700/30 text-amber-300"}`}>
          Deposit variance: <strong>{depositVariance < 0 ? "−" : "+"}{fmt(Math.abs(depositVariance))}</strong>
        </div>
      )}

      {/* Deposited By */}
      <div>
        <label htmlFor="depositedBy" className="mb-1.5 block text-sm font-medium text-brand-cream-300">
          Deposited By <span className="ml-1 text-brand-brass-400">*</span>
        </label>
        <select
          id="depositedBy"
          name="depositedBy"
          defaultValue={defaultDepositedBy}
          required
          className="w-full appearance-none rounded-xl bg-brand-moss-800/60 px-4 py-3 text-brand-cream-100 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 min-h-[48px]"
        >
          {!defaultDepositedBy && <option value="" disabled>Select…</option>}
          {(DRAWER_CLOSE.columns.depositedBy.labels as readonly string[]).map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      <AttachmentPicker
        name="bankReceiptPhoto"
        label="Bank Receipt Photo"
        accept="image/*"
      />

      <TextareaField name="depositNotes" label="Notes" rows={2} />

      <SubmitButton label="Record Deposit" pendingLabel="Saving…" />
    </form>
  );
}
