import { requireActiveSession } from "@/lib/auth";
import { mondayQuery } from "@/lib/monday";
import { TRAINING } from "@/lib/monday-schema";
import { LogPageHeader } from "@/components/logs/LogPageHeader";
import { ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

interface MondayItem {
  id: string;
  name: string;
  updated_at: string;
}

interface BoardResponse {
  boards: {
    items_page: {
      items: MondayItem[];
    };
  }[];
}

function formatUpdatedAt(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default async function TrainingLogPage() {
  const user = await requireActiveSession();
  const canCreate = user.role === "CAPTAIN" || user.role === "ADMIN";

  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 100, query_params: {
          order_by: [{ column_id: "__last_updated__", direction: desc }]
        }) {
          items {
            id
            name
            updated_at
          }
        }
      }
    }
  `;

  let items: MondayItem[] = [];
  let loadError = "";
  try {
    const data = await mondayQuery<BoardResponse>(query, { boardId: TRAINING.boardId });
    items = data.boards[0]?.items_page?.items ?? [];
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load training entries.";
  }

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <LogPageHeader
          title="Training Log"
          description={`Records synced from Monday board ${TRAINING.boardId}.`}
          newHref={canCreate ? "/training-log/new" : undefined}
          newLabel="New Entry"
        />

        {loadError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-900/20 p-5 text-sm text-red-300">
            {loadError}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-brand-moss-600/40 p-8 text-center text-brand-cream-400">
            No training entries found on the board yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`https://stegenriverboat.monday.com/boards/${TRAINING.boardId}/pulses/${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl bg-brand-moss-600/50 px-5 py-4 ring-1 ring-brand-cream-900/20 transition hover:ring-brand-brass-400/40 active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-brand-cream-100">{item.name || "(Untitled item)"}</p>
                    <p className="mt-1 text-sm text-brand-cream-400">
                      Last updated {formatUpdatedAt(item.updated_at)}
                    </p>
                  </div>
                  <ChevronRightIcon />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
