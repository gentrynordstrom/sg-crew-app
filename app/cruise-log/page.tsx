import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { mondayQuery } from "@/lib/monday";
import { CRUISE } from "@/lib/monday-schema";
import { LogPageHeader } from "@/components/logs/LogPageHeader";
import { StatusChip } from "@/components/logs/StatusChip";

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
  boards: {
    items_page: {
      items: MondayItem[];
    };
  }[];
}

function outcomeVariant(outcome: string) {
  if (outcome.startsWith("Completed")) return "success" as const;
  if (outcome.startsWith("Canceled")) return "danger" as const;
  if (outcome === "Planned") return "default" as const;
  return "muted" as const;
}

export default async function CruiseLogPage() {
  await requireRole(["CAPTAIN", "ADMIN"]);

  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 25, query_params: {
          order_by: [{ column_id: "__last_updated__", direction: desc }]
        }) {
          items {
            id
            name
            column_values(ids: [
              "${CRUISE.columns.outcome.id}",
              "${CRUISE.columns.cruiseType.id}",
              "${CRUISE.columns.captain.id}",
              "${CRUISE.columns.guests.id}",
              "${CRUISE.columns.departureTime.id}"
            ]) {
              id
              text
            }
          }
        }
      }
    }
  `;

  let items: MondayItem[] = [];
  try {
    const data = await mondayQuery<BoardResponse>(query, { boardId: CRUISE.boardId });
    items = data.boards[0]?.items_page?.items ?? [];
  } catch (err) {
    console.error("Failed to load cruise log:", err);
  }

  function col(item: MondayItem, id: string) {
    return item.column_values.find((c) => c.id === id)?.text ?? "";
  }

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <LogPageHeader
          title="Cruise Log"
          description="Captain's log entries for each cruise."
          newHref="/cruise-log/new"
        />

        {items.length === 0 ? (
          <div className="rounded-2xl bg-brand-moss-600/40 p-8 text-center text-brand-cream-400">
            No entries yet.{" "}
            <Link href="/cruise-log/new" className="text-brand-brass-300 underline underline-offset-4">
              Add the first one.
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const outcome = col(item, CRUISE.columns.outcome.id);
              const cruiseType = col(item, CRUISE.columns.cruiseType.id);
              const captain = col(item, CRUISE.columns.captain.id);
              const guests = col(item, CRUISE.columns.guests.id);
              const departure = col(item, CRUISE.columns.departureTime.id);
              return (
                <li
                  key={item.id}
                  className="rounded-2xl bg-brand-moss-600/50 px-5 py-4 ring-1 ring-brand-cream-900/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-brand-cream-100">{item.name}</span>
                    {outcome && (
                      <StatusChip label={outcome} variant={outcomeVariant(outcome)} />
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-cream-400">
                    {cruiseType && <span>{cruiseType}</span>}
                    {captain && <span>Capt. {captain}</span>}
                    {guests && <span>{guests} guests</span>}
                    {departure && <span>Dep. {departure}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
