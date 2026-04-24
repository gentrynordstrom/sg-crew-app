import { requireRole } from "@/lib/auth";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { TransactionForm } from "@/components/logs/TransactionForm";
import { TRANSACTIONS } from "@/lib/monday-schema";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const user = await requireRole([
    "CAPTAIN",
    "DECKHAND",
    "MECHANIC",
    "HOSPITALITY",
    "ADMIN",
  ]);

  const today = new Date().toISOString().slice(0, 10);

  // Default "Person" to the logged-in user's first name if it matches a label
  const personLabels = TRANSACTIONS.columns.person.labels as readonly string[];
  const firstName = user.name.split(" ")[0];
  const defaultPerson =
    personLabels.find((l) => l.toLowerCase() === firstName.toLowerCase()) ?? "";

  return (
    <LogFormWrapper
      title="New Transaction"
      backHref="/transactions"
      backLabel="Transactions"
    >
      <TransactionForm defaultDate={today} defaultPerson={defaultPerson} />
    </LogFormWrapper>
  );
}
