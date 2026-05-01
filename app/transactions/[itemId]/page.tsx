import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fetchMondayItem } from "@/lib/monday-item";
import { TRANSACTIONS } from "@/lib/monday-schema";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { LogDetailView } from "@/components/logs/LogDetailView";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({
  params,
}: {
  params: { itemId: string };
}) {
  await requireRole(["CAPTAIN", "DECKHAND", "MECHANIC", "HOSPITALITY", "ADMIN"]);
  const item = await fetchMondayItem(params.itemId);
  if (!item) notFound();

  function col(id: string) {
    return item!.column_values.find((c) => c.id === id)?.text || null;
  }

  const fields = [
    { label: "Date", value: col(TRANSACTIONS.columns.date.id) },
    { label: "Amount", value: col(TRANSACTIONS.columns.amount.id) },
    { label: "Type", value: col(TRANSACTIONS.columns.transactionType.id) },
    { label: "Payment Method", value: col(TRANSACTIONS.columns.currency.id) },
    { label: "Category", value: col(TRANSACTIONS.columns.category.id) },
    { label: "Payee / Payer", value: col(TRANSACTIONS.columns.payeePayer.id) },
    { label: "Person", value: col(TRANSACTIONS.columns.person.id) },
    { label: "Notes", value: col(TRANSACTIONS.columns.notes.id), wide: true },
  ];

  return (
    <LogFormWrapper title={item.name} backHref="/transactions" backLabel="Transactions">
      <LogDetailView title={item.name} fields={fields} assets={item.assets} />
    </LogFormWrapper>
  );
}
