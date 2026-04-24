import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { mondayQuery } from "@/lib/monday";
import { MAINTENANCE } from "@/lib/monday-schema";
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
  boards: { items_page: { items: MondayItem[] } }[];
}

export default async function MaintenanceLogPage() {
  await requireRole(["CAPTAIN", "DECKHAND", "MECHANIC", "ADMIN"]);

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
              "${MAINTENANCE.columns.date.id}",
              "${MAINTENANCE.columns.maintenanceType.id}",
              "${MAINTENANCE.columns.resolved.id}",
              "${MAINTENANCE.columns.crewMember.id}"
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
    const data = await mondayQuery<BoardResponse>(query, { boardId: MAINTENANCE.boardId });
    items = data.boards[0]?.items_page?.items ?? [];
  } catch (err) {
    console.error("Failed to load maintenance log:", err);
  }

  function col(item: MondayItem, id: string) {
    return item.column_values.find((c) => c.id === id)?.text ?? "";
  }

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <LogPageHeader
          title="Maintenance Log"
          description="Mechanical work, repairs, and service records."
          newHref="/maintenance-log/new"
        />

        {items.length === 0 ? (
          <div className="rounded-2xl bg-brand-moss-600/40 p-8 text-center text-brand-cream-400">
            No entries yet.{" "}
            <Link href="/maintenance-log/new" className="text-brand-brass-300 underline underline-offset-4">
              Add the first one.
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const date = col(item, MAINTENANCE.columns.date.id);
              const maintenanceType = col(item, MAINTENANCE.columns.maintenanceType.id);
              const resolved = col(item, MAINTENANCE.columns.resolved.id);
              const crew = col(item, MAINTENANCE.columns.crewMember.id);
              return (
                <li
                  key={item.id}
                  className="rounded-2xl bg-brand-moss-600/50 px-5 py-4 ring-1 ring-brand-cream-900/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-brand-cream-100">{item.name}</span>
                    {resolved && (
                      <StatusChip
                        label={resolved}
                        variant={resolved === "Yes" ? "success" : "warning"}
                      />
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-cream-400">
                    {date && <span>{date}</span>}
                    {maintenanceType && <span>{maintenanceType}</span>}
                    {crew && <span>{crew}</span>}
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
