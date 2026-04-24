import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { mondayQuery } from "@/lib/monday";
import { DRAWER_CLOSE } from "@/lib/monday-schema";
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
  group: { id: string; title: string };
  column_values: MondayColumnValue[];
}

interface BoardResponse {
  boards: { items_page: { items: MondayItem[] } }[];
}

function varianceVariant(status: string) {
  if (status === "Balanced" || status === "Approved" || status === "Deposited") return "success" as const;
  if (status === "Short") return "danger" as const;
  if (status === "Over") return "warning" as const;
  if (status === "Ready to Deposit") return "default" as const;
  return "muted" as const;
}

const FETCH_COLS = [
  DRAWER_CLOSE.columns.shiftDate.id,
  DRAWER_CLOSE.columns.bartender.id,
  DRAWER_CLOSE.columns.drawer.id,
  DRAWER_CLOSE.columns.variance.id,
  DRAWER_CLOSE.columns.status.id,
  DRAWER_CLOSE.columns.closingCount.id,
  DRAWER_CLOSE.columns.toDeposit.id,
];

export default async function DrawerClosePage() {
  const user = await requireRole(["HOSPITALITY", "ADMIN"]);
  const isAdmin = user.role === "ADMIN";

  const colList = FETCH_COLS.map((id) => `"${id}"`).join(", ");
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 50, query_params: {
          order_by: [{ column_id: "__last_updated__", direction: desc }]
        }) {
          items {
            id name
            group { id title }
            column_values(ids: [${colList}]) { id text }
          }
        }
      }
    }
  `;

  let items: MondayItem[] = [];
  try {
    const data = await mondayQuery<BoardResponse>(query, { boardId: DRAWER_CLOSE.boardId });
    items = data.boards[0]?.items_page?.items ?? [];
  } catch (err) {
    console.error("Failed to load drawer close log:", err);
  }

  function col(item: MondayItem, id: string) {
    return item.column_values.find((c) => c.id === id)?.text ?? "";
  }

  const firstName = user.name.split(" ")[0].toLowerCase();

  // Bartenders see only their own entries
  const visibleItems = isAdmin
    ? items
    : items.filter((item) =>
        col(item, DRAWER_CLOSE.columns.bartender.id).toLowerCase().includes(firstName)
      );

  // Admin: separate "Ready to Deposit" queue
  const readyToDeposit = isAdmin
    ? visibleItems.filter(
        (item) =>
          item.group.id === DRAWER_CLOSE.groups.readyToDeposit ||
          col(item, DRAWER_CLOSE.columns.status.id) === "Ready to Deposit"
      )
    : [];

  const allOthers = isAdmin
    ? visibleItems.filter((item) => item.group.id !== DRAWER_CLOSE.groups.readyToDeposit)
    : visibleItems;

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <LogPageHeader
          title="Drawer Close Log"
          description="End-of-shift POS drawer reconciliation."
          newHref="/drawer-close/new"
          newLabel="Close Drawer"
        />

        {/* Patio handoff button for hospitality users */}
        <div className="mb-6">
          <Link
            href="/drawer-close/handoff"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-cream-600/30 bg-brand-moss-600/40 px-4 py-2.5 text-sm font-medium text-brand-cream-300 transition hover:border-brand-brass-400/40 hover:text-brand-cream-100"
          >
            <span>↔</span> Log Patio Handoff
          </Link>
        </div>

        {/* Admin: Ready to Deposit queue */}
        {isAdmin && readyToDeposit.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-brass-400">
              Ready to Deposit ({readyToDeposit.length})
            </h2>
            <ul className="space-y-3">
              {readyToDeposit.map((item) => {
                const date = col(item, DRAWER_CLOSE.columns.shiftDate.id);
                const bartender = col(item, DRAWER_CLOSE.columns.bartender.id);
                const drawer = col(item, DRAWER_CLOSE.columns.drawer.id);
                const toDeposit = col(item, DRAWER_CLOSE.columns.toDeposit.id);
                return (
                  <li key={item.id}>
                    <Link
                      href={`/drawer-close/deposit/${item.id}`}
                      className="block rounded-2xl bg-brand-brass-700/30 px-5 py-4 ring-1 ring-brand-brass-500/40 transition hover:ring-brand-brass-400/60"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-brand-cream-100">{item.name}</span>
                        <StatusChip label="Ready to Deposit" variant="default" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-cream-400">
                        {date && <span>{date}</span>}
                        {bartender && <span>{bartender}</span>}
                        {drawer && <span>{drawer}</span>}
                        {toDeposit && (
                          <span className="font-medium text-brand-brass-300">
                            Deposit: ${parseFloat(toDeposit).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-brand-brass-400">Tap to record deposit →</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* All entries */}
        <section>
          {isAdmin && (
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-cream-500">
              All Shifts
            </h2>
          )}

          {allOthers.length === 0 && readyToDeposit.length === 0 ? (
            <div className="rounded-2xl bg-brand-moss-600/40 p-8 text-center text-brand-cream-400">
              No entries yet.{" "}
              <Link href="/drawer-close/new" className="text-brand-brass-300 underline underline-offset-4">
                Submit your first drawer close.
              </Link>
            </div>
          ) : allOthers.length === 0 ? null : (
            <ul className="space-y-3">
              {allOthers.map((item) => {
                const date = col(item, DRAWER_CLOSE.columns.shiftDate.id);
                const bartender = col(item, DRAWER_CLOSE.columns.bartender.id);
                const drawer = col(item, DRAWER_CLOSE.columns.drawer.id);
                const status = col(item, DRAWER_CLOSE.columns.status.id);
                const variance = col(item, DRAWER_CLOSE.columns.variance.id);
                const closing = col(item, DRAWER_CLOSE.columns.closingCount.id);
                const group = item.group?.title ?? "";
                return (
                  <li key={item.id}>
                    <Link
                      href={`/drawer-close/${item.id}`}
                      className="flex items-center gap-3 rounded-2xl bg-brand-moss-600/50 px-5 py-4 ring-1 ring-brand-cream-900/20 transition hover:ring-brand-brass-400/40 active:scale-[0.99]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-brand-cream-100">{item.name}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {status && <StatusChip label={status} variant={varianceVariant(status)} />}
                            {isAdmin && group && group !== "This Week" && group !== "Needs Review" && (
                              <StatusChip label={group} variant="muted" />
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-cream-400">
                          {date && <span>{date}</span>}
                          {bartender && <span>{bartender}</span>}
                          {drawer && <span>{drawer}</span>}
                          {closing && <span>Counted: ${parseFloat(closing).toFixed(2)}</span>}
                          {variance && status !== "Balanced" && status !== "Deposited" && (
                            <span
                              className={
                                status === "Short"
                                  ? "text-red-400"
                                  : status === "Over"
                                  ? "text-amber-300"
                                  : ""
                              }
                            >
                              Var: ${parseFloat(variance).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRightIcon />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
