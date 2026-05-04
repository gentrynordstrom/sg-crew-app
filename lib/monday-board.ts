import "server-only";

import { mondayQuery } from "@/lib/monday";

export interface MondayBoardGroup {
  id: string;
  title: string;
}

export interface MondayBoardColumnRow {
  id: string;
  settings_str?: string | null;
}

export interface MondayBoardSnapshot {
  groups: MondayBoardGroup[];
  columns: MondayBoardColumnRow[];
}

const GROUP_TITLE_PREFERENCES = [
  "training",
  "active",
  "topics",
  "new group",
  "general",
] as const;

/**
 * Parse Monday dropdown column `settings_str` JSON into display labels (order preserved).
 */
export function parseDropdownLabelsFromSettingsStr(
  settingsStr: string | null | undefined
): string[] {
  if (!settingsStr) return [];
  try {
    const s = JSON.parse(settingsStr) as Record<string, unknown>;
    const raw = s.labels ?? s.options;
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const item of raw) {
      if (typeof item === "string" && item.trim()) {
        out.push(item.trim());
        continue;
      }
      if (item && typeof item === "object" && "name" in item) {
        const name = (item as { name?: unknown }).name;
        if (typeof name === "string" && name.trim()) out.push(name.trim());
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function dropdownLabelsFromSnapshot(
  columns: MondayBoardColumnRow[],
  columnId: string
): string[] {
  const col = columns.find((c) => c.id === columnId);
  return parseDropdownLabelsFromSettingsStr(col?.settings_str);
}

/**
 * Load groups + column settings for a board (one round trip).
 */
export async function fetchMondayBoardSnapshot(boardId: string): Promise<MondayBoardSnapshot> {
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        groups { id title }
        columns { id settings_str }
      }
    }
  `;
  type Q = {
    boards: {
      groups: MondayBoardGroup[];
      columns: MondayBoardColumnRow[];
    }[];
  };
  const data = await mondayQuery<Q>(query, { boardId });
  const board = data.boards[0];
  if (!board) {
    throw new Error(`Monday board ${boardId} not found or not accessible.`);
  }
  return {
    groups: board.groups ?? [],
    columns: board.columns ?? [],
  };
}

/**
 * Pick `group_id` for `create_item`.
 * If `envOverride` is set (e.g. `MONDAY_TRAINING_GROUP_ID`), it wins.
 * Otherwise prefer known default titles, then first group.
 */
export function resolveGroupIdFromSnapshot(
  groups: MondayBoardGroup[],
  envOverride?: string | null
): string {
  const trimmed = envOverride?.trim();
  if (trimmed) return trimmed;

  if (!groups.length) {
    throw new Error("Monday board has no groups; cannot create an item.");
  }

  const lower = (t: string) => t.trim().toLowerCase();
  for (const pref of GROUP_TITLE_PREFERENCES) {
    const hit = groups.find((g) => lower(g.title) === pref);
    if (hit) return hit.id;
  }
  for (const pref of GROUP_TITLE_PREFERENCES) {
    const hit = groups.find((g) => lower(g.title).includes(pref));
    if (hit) return hit.id;
  }
  return groups[0].id;
}
