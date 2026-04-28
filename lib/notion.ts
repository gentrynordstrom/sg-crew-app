import type { Role } from "@prisma/client";

const NOTION_API_TOKEN = process.env.NOTION_API_TOKEN;
const NOTION_VERSION = "2022-06-28";
const NOTION_API_BASE = "https://api.notion.com/v1";

if (!NOTION_API_TOKEN) {
  console.warn("NOTION_API_TOKEN is not set — Notion sync will fail when invoked");
}

type NotionPropertyValue =
  | {
      type: "title";
      title: Array<{ plain_text: string }>;
    }
  | {
      type: "rich_text";
      rich_text: Array<{ plain_text: string }>;
    }
  | {
      type: "multi_select";
      multi_select: Array<{ name: string }>;
    }
  | {
      type: "select";
      select: { name: string } | null;
    }
  | {
      type: "url";
      url: string | null;
    }
  | {
      type: "checkbox";
      checkbox: boolean;
    }
  | {
      type: string;
      [key: string]: unknown;
    };

export interface NotionPage {
  id: string;
  url: string;
  archived: boolean;
  properties: Record<string, NotionPropertyValue>;
}

interface NotionQueryDatabaseResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

interface NotionBlockChildrenResponse {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface NormalizedSopDocument {
  notionPageId: string;
  notionUrl: string;
  title: string;
  summary: string | null;
  allowedRoles: Role[];
}

export interface NormalizedSopBlock {
  blockId: string;
  parentBlockId: string | null;
  orderIndex: number;
  depth: number;
  type: string;
  payload: unknown;
}

const ALLOWED_SOP_TYPES = new Set(["sop", "checklist"]);

function notionHeaders() {
  return {
    Authorization: `Bearer ${NOTION_API_TOKEN}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

async function notionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${NOTION_API_BASE}${path}`, {
    ...init,
    headers: {
      ...notionHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Notion API error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

export async function fetchDatabasePages(databaseId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | null = null;

  do {
    const body: Record<string, unknown> = {
      page_size: 100,
    };
    if (cursor) body.start_cursor = cursor;

    const data = await notionFetch<NotionQueryDatabaseResponse>(`/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  return pages;
}

async function fetchBlockChildren(blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | null = null;

  do {
    const qs = new URLSearchParams({ page_size: "100" });
    if (cursor) qs.set("start_cursor", cursor);
    const data = await notionFetch<NotionBlockChildrenResponse>(
      `/blocks/${blockId}/children?${qs.toString()}`,
      { method: "GET" }
    );

    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  return blocks;
}

function propertyPlainText(value: NotionPropertyValue | undefined): string {
  if (!value) return "";
  if (value.type === "title") {
    const title = (value as { title?: Array<{ plain_text?: string }> }).title;
    return Array.isArray(title) ? title.map((t) => t.plain_text ?? "").join("") : "";
  }
  if (value.type === "rich_text") {
    const richText = (value as { rich_text?: Array<{ plain_text?: string }> }).rich_text;
    return Array.isArray(richText) ? richText.map((t) => t.plain_text ?? "").join("") : "";
  }
  if (value.type === "select") {
    const select = (value as { select?: { name?: string } | null }).select;
    return select?.name ?? "";
  }
  if (value.type === "url") {
    const url = (value as { url?: string | null }).url;
    return typeof url === "string" ? url : "";
  }
  return "";
}

function propertyMultiSelect(value: NotionPropertyValue | undefined): string[] {
  if (!value || value.type !== "multi_select") return [];
  const multi = (value as { multi_select?: Array<{ name?: string }> }).multi_select;
  if (!Array.isArray(multi)) return [];
  return multi.map((s) => s.name ?? "").filter(Boolean);
}

function propertyTextValues(value: NotionPropertyValue | undefined): string[] {
  if (!value) return [];
  if (value.type === "multi_select") return propertyMultiSelect(value);
  const single = propertyPlainText(value).trim();
  return single ? [single] : [];
}

function normalizeTypeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ").replace(/-/g, " ");
}

export function pageHasAllowedSopType(page: NotionPage): boolean {
  const props = page.properties ?? {};
  const typeValues = [
    ...propertyTextValues(props.Type),
    ...propertyTextValues(props["Document Type"]),
    ...propertyTextValues(props["Doc Type"]),
  ];
  return typeValues.some((label) => ALLOWED_SOP_TYPES.has(normalizeTypeLabel(label)));
}

const VALID_ROLES = new Set<Role>([
  "CAPTAIN",
  "DECKHAND",
  "MECHANIC",
  "HOSPITALITY",
  "NARRATOR",
  "ADMIN",
]);

function parseRoles(names: string[]): Role[] {
  const normalized = names
    .map((name) => name.trim().toUpperCase().replace(/\s+/g, "_"))
    .filter((name): name is Role => VALID_ROLES.has(name as Role));
  return Array.from(new Set(normalized));
}

export function normalizePage(page: NotionPage): NormalizedSopDocument {
  const props = page.properties ?? {};

  const title =
    propertyPlainText(props.Name) ||
    propertyPlainText(props.Title) ||
    "Untitled SOP";

  const summary =
    propertyPlainText(props.Summary) ||
    propertyPlainText(props.Description) ||
    null;

  const roleNames = [
    ...propertyMultiSelect(props.AllowedRoles),
    ...propertyMultiSelect(props["Allowed Roles"]),
    ...propertyMultiSelect(props.Roles),
  ];

  return {
    notionPageId: page.id,
    notionUrl: page.url,
    title,
    summary,
    allowedRoles: parseRoles(roleNames),
  };
}

export async function fetchAndFlattenPageBlocks(pageId: string): Promise<NormalizedSopBlock[]> {
  const out: NormalizedSopBlock[] = [];
  let order = 0;

  async function walk(currentId: string, depth: number, parentBlockId: string | null) {
    const children = await fetchBlockChildren(currentId);
    for (const block of children) {
      const payload = (block as Record<string, unknown>)[block.type] ?? {};
      out.push({
        blockId: block.id,
        parentBlockId,
        orderIndex: order++,
        depth,
        type: block.type,
        payload,
      });
      if (block.has_children) {
        await walk(block.id, depth + 1, block.id);
      }
    }
  }

  await walk(pageId, 0, null);
  return out;
}

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base || "untitled-sop";
}
