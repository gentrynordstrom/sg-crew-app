import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { mondayQuery } from "@/lib/monday";
import { TRANSACTIONS } from "@/lib/monday-schema";
import { LogPageHeader } from "@/components/logs/LogPageHeader";
import { StatusChip } from "@/components/logs/StatusChip";
import { ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

interface MondayColumnValue {
  id: string;
  text: string;
}

interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

interface BoardResponse {
  boards: { items_page: { items: MondayItem[] } }[];
}

export default async function TransactionsPage() {
  const user = await requireRole(["CAPTAIN", "DECKHAND", "MECHANIC", "HOSPITALITY", "ADMIN"]);
  const isAdmin = user.role === "ADMIN";

  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 100, query_params: {
          order_by: [{ column_id: "__last_updated__", direction: desc }]
        }) {
          items {
            id
            name
            column_values(ids: [
              "${TRANSACTIONS.columns.date.id}",
              "${TRANSACTIONS.columns.amount.id}",
              "${TRANSACTIONS.columns.transactionType.id}",
              "${TRANSACTIONS.columns.currency.id}",
              "${TRANSACTIONS.columns.category.id}",
              "${TRANSACTIONS.columns.person.id}"
            ]) {
              id
              text
            }
          }
        }
      }
    }
  `;

  let allItems: MondayItem[] = [];
  try {
    const data = await mondayQuery<BoardResponse>(query, { boardId: TRANSACTIONS.boardId });
    allItems = data.boards[0]?.items_page?.items ?? [];
  } catch (err) {
    console.error("Failed to load transactions:", err);
  }

  function col(item: MondayItem, id: string) {
    return item.column_values.find((c) => c.id === id)?.text ?? "";
  }

  const firstName = user.name.split(" ")[0].toLowerCase();
  const items = isAdmin
    ? allItems
    : allItems.filter((item) =>
        col(item, TRANSACTIONS.columns.person.id).toLowerCase().includes(firstName)
      );

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <LogPageHeader
          title="Transactions"
          description="Income, expenses, and receipts."
          newHref="/transactions/new"
        />

        {items.length === 0 ? (
          <div className="rounded-2xl bg-brand-moss-600/40 p-8 text-center text-brand-cream-400">
            No entries yet.{" "}
            <Link href="/transactions/new" className="text-brand-brass-300 underline underline-offset-4">
              Add the first one.
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const date = col(item, TRANSACTIONS.columns.date.id);
              const amount = col(item, TRANSACTIONS.columns.amount.id);
              const txType = col(item, TRANSACTIONS.columns.transactionType.id);
              const currency = col(item, TRANSACTIONS.columns.currency.id);
              const category = col(item, TRANSACTIONS.columns.category.id);
              const person = col(item, TRANSACTIONS.columns.person.id);
              return (
                <li key={item.id}>
                  <Link
                    href={`/transactions/${item.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-brand-moss-600/50 px-5 py-4 ring-1 ring-brand-cream-900/20 transition hover:ring-brand-brass-400/40 active:scale-[0.99]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-brand-cream-100">{item.name}</span>
                        {txType && (
                          <StatusChip
                            label={txType}
                            variant={txType === "Income" ? "success" : "warning"}
                          />
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-cream-400">
                        {date && <span>{date}</span>}
                        {amount && <span className="font-medium text-brand-cream-200">{amount}</span>}
                        {category && <span>{category}</span>}
                        {currency && <span>{currency}</span>}
                        {person && <span>{person}</span>}
                      </div>
                    </div>
                    <ChevronRightIcon />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
