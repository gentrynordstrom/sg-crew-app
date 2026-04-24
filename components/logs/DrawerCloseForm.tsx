"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createDrawerCloseEntry } from "@/app/drawer-close/actions";
import { DRAWER_CLOSE } from "@/lib/monday-schema";
import { SelectField, TextareaField } from "./FormField";
import { AttachmentPicker } from "./AttachmentPicker";
import { SubmitButton } from "./SubmitButton";

interface PatioHandoffInfo {
  id: string;
  amountTransferred: number;
  mainBartenderName: string;
}

interface MainHandoffInfo {
  id: string;
  amountTransferred: number;
  patioBartenderName: string;
}

interface DrawerCloseFormProps {
  defaultBartender: string;
  defaultDate: string;
  patioHandoff: PatioHandoffInfo | null;
  mainHandoffs: MainHandoffInfo[];
}

function parseAmt(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmt(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function DrawerCloseForm({
  defaultBartender,
  defaultDate,
  patioHandoff,
  mainHandoffs,
}: DrawerCloseFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<"Main Bar" | "Patio Bar">("Main Bar");
  const [openingCash, setOpeningCash] = useState("500");
  const [posSales, setPosSales] = useState("");
  const [cashSales, setCashSales] = useState("");
  const [cardTips, setCardTips] = useState("");
  const [payouts, setPayouts] = useState("");
  const [closingCount, setClosingCount] = useState("");
  const [bankReturnedToMain, setBankReturnedToMain] = useState("");
  const [handoffReturned, setHandoffReturned] = useState<Record<string, string>>(
    Object.fromEntries(mainHandoffs.map((h) => [h.id, ""]))
  );

  const cashSalesAmt = parseAmt(cashSales);
  const payoutsAmt = parseAmt(payouts);
  const closingCountAmt = parseAmt(closingCount);

  // Opening amount
  const opening =
    drawer === "Main Bar"
      ? parseAmt(openingCash)
      : patioHandoff?.amountTransferred ?? 0;

  // Handoff totals (Main only)
  const transferredToPatio = mainHandoffs.reduce((s, h) => s + h.amountTransferred, 0);
  const returnedFromPatio = mainHandoffs.reduce(
    (s, h) => s + parseAmt(handoffReturned[h.id] ?? ""),
    0
  );

  // Expected Cash
  let expectedCash: number;
  if (drawer === "Main Bar") {
    expectedCash = opening + cashSalesAmt - payoutsAmt - transferredToPatio + returnedFromPatio;
  } else {
    const bankReturnedAmt = parseAmt(bankReturnedToMain);
    expectedCash = opening + cashSalesAmt - payoutsAmt - bankReturnedAmt;
  }

  const variance = closingCountAmt - expectedCash;
  const hasCalc = cashSales || closingCount || drawer === "Patio Bar";

  const varianceColor =
    Math.abs(variance) < 0.01
      ? "text-emerald-300"
      : variance < 0
      ? "text-red-400"
      : "text-amber-300";

  const varianceLabel =
    !closingCount
      ? "—"
      : Math.abs(variance) < 0.01
      ? "Balanced ✓"
      : variance < 0
      ? `Short ${fmt(Math.abs(variance))}`
      : `Over ${fmt(variance)}`;

  const patioBlocked = drawer === "Patio Bar" && !patioHandoff;

  async function handleSubmit(fd: FormData) {
    setFormError(null);
    try {
      const result = await createDrawerCloseEntry(fd);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      router.push("/drawer-close");
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
      {/* Date */}
      <div>
        <label htmlFor="shiftDate" className="mb-1.5 block text-sm font-medium text-brand-cream-300">
          Shift Date <span className="ml-1 text-brand-brass-400">*</span>
        </label>
        <input
          id="shiftDate"
          name="shiftDate"
          type="date"
          defaultValue={defaultDate}
          required
          className="w-full appearance-none rounded-xl bg-brand-moss-800/60 px-4 py-3 text-brand-cream-100 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 min-h-[48px]"
        />
      </div>

      <SelectField
        name="bartender"
        label="Bartender"
        options={DRAWER_CLOSE.columns.bartender.labels}
        defaultValue={defaultBartender}
        required
      />

      {/* Drawer picker */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-brand-cream-300">
          Drawer <span className="ml-1 text-brand-brass-400">*</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["Main Bar", "Patio Bar"] as const).map((d) => (
            <label
              key={d}
              className={`flex cursor-pointer items-center justify-center rounded-xl border-2 py-4 text-sm font-semibold transition ${
                drawer === d
                  ? "border-brand-brass-400 bg-brand-brass-500/20 text-brand-brass-200"
                  : "border-brand-cream-900/30 bg-brand-moss-800/40 text-brand-cream-400 hover:border-brand-cream-600/40"
              }`}
            >
              <input
                type="radio"
                name="drawer"
                value={d}
                checked={drawer === d}
                onChange={() => setDrawer(d)}
                className="sr-only"
              />
              {d}
            </label>
          ))}
        </div>
      </div>

      {/* Patio blocked state */}
      {patioBlocked && (
        <div className="rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          <strong>No handoff logged for today.</strong> Ask the Main bartender to log the
          Patio handoff before you can close your drawer.
        </div>
      )}

      {/* Patio: read-only opening bank from handoff */}
      {drawer === "Patio Bar" && patioHandoff && (
        <div className="rounded-xl bg-brand-moss-800/60 px-4 py-3 ring-1 ring-brand-brass-500/30">
          <p className="text-sm text-brand-cream-400">
            Opening bank from Main ({patioHandoff.mainBartenderName})
          </p>
          <p className="text-xl font-bold text-brand-brass-300">
            ${patioHandoff.amountTransferred.toFixed(2)}
          </p>
          <input type="hidden" name="openingAmount" value={patioHandoff.amountTransferred} />
        </div>
      )}

      {/* Main Bar: editable Opening Cash (pre-filled $500) */}
      {drawer === "Main Bar" && (
        <MoneyField
          name="openingAmount"
          label="Opening Cash"
          value={openingCash}
          onChange={setOpeningCash}
          required
        />
      )}

      <SelectField
        name="shiftType"
        label="Shift Type"
        options={DRAWER_CLOSE.columns.shiftType.labels}
        defaultValue="Default"
      />

      <p className="text-xs font-semibold uppercase tracking-widest text-brand-cream-500 pt-1">
        Sales &amp; Cash
      </p>

      <MoneyField name="posSales" label="POS Sales" value={posSales} onChange={setPosSales} required />

      <div className="grid grid-cols-2 gap-4">
        <MoneyField name="cashSales" label="Cash Sales" value={cashSales} onChange={setCashSales} required />
        <MoneyField name="tipsCreditCard" label="Card Tips" value={cardTips} onChange={setCardTips} />
      </div>

      <MoneyField name="payouts" label="Payouts" value={payouts} onChange={setPayouts} />

      {/* Patio: return amount to Main */}
      {drawer === "Patio Bar" && patioHandoff && (
        <MoneyField
          name="bankReturnedToMain"
          label="Cash Returned to Main Bar"
          value={bankReturnedToMain}
          onChange={setBankReturnedToMain}
          required
        />
      )}

      {/* Main: per-handoff reconciliation */}
      {drawer === "Main Bar" && mainHandoffs.length > 0 && (
        <div className="space-y-3 rounded-xl bg-brand-moss-800/40 p-4 ring-1 ring-brand-brass-500/20">
          <p className="text-sm font-semibold text-brand-brass-300">Patio Handoff Reconciliation</p>
          {mainHandoffs.map((h) => (
            <div key={h.id} className="space-y-2">
              <p className="text-xs text-brand-cream-400">
                Transferred to {h.patioBartenderName}: ${h.amountTransferred.toFixed(2)}
              </p>
              <MoneyField
                name={`handoffReturned_${h.id}`}
                label={`Cash Returned by ${h.patioBartenderName}`}
                value={handoffReturned[h.id] ?? ""}
                onChange={(v) => setHandoffReturned((p) => ({ ...p, [h.id]: v }))}
                required
              />
            </div>
          ))}
        </div>
      )}

      {/* Live reconciliation summary */}
      {hasCalc && (
        <div className="rounded-xl bg-brand-moss-800/60 ring-1 ring-brand-cream-900/30 divide-y divide-brand-cream-900/20">
          <div className="flex justify-between px-4 py-3 text-sm">
            <span className="text-brand-cream-400">Expected Cash</span>
            <span className="font-medium text-brand-cream-200">{fmt(expectedCash)}</span>
          </div>
          <div className="px-4 py-3">
            <MoneyField
              name="closingCount"
              label="Closing Count (cash you counted)"
              value={closingCount}
              onChange={setClosingCount}
              required
            />
          </div>
          {closingCount && (
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-brand-cream-400">Variance</span>
              <span className={`text-base font-bold ${varianceColor}`}>{varianceLabel}</span>
            </div>
          )}
        </div>
      )}

      {/* If calc not shown yet, still need closing count */}
      {!hasCalc && (
        <MoneyField
          name="closingCount"
          label="Closing Count (cash you counted)"
          value={closingCount}
          onChange={setClosingCount}
          required
        />
      )}

      <TextareaField name="notes" label="Notes" rows={3} />

      <AttachmentPicker
        name="posPhoto"
        label="POS Photo"
        accept="image/*"
        capture="environment"
      />

      <SubmitButton label="Submit Drawer Close" pendingLabel="Submitting…" />
    </form>
  );
}

interface MoneyFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}

function MoneyField({ name, label, value, onChange, required }: MoneyFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-brand-cream-300">
        {label}
        {required && <span className="ml-1 text-brand-brass-400">*</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-brand-cream-500">
          $
        </span>
        <input
          id={name}
          name={name}
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder="0.00"
          className="w-full rounded-xl bg-brand-moss-800/60 py-3 pl-7 pr-4 text-brand-cream-100 placeholder-brand-cream-600 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 min-h-[48px]"
        />
      </div>
    </div>
  );
}
