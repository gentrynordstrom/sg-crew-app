import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchAndFlattenPageBlocks,
  fetchDatabasePages,
  normalizePage,
  pageHasAllowedSopType,
  slugifyTitle,
} from "@/lib/notion";

interface SyncResult {
  created: number;
  updated: number;
  archived: number;
  errors: string[];
}

const SOURCE_TYPE = "notion";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.NOTION_SYNC_CRON_SECRET}`;

  if (!isCron) {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const databaseId = process.env.NOTION_SOP_DATABASE_ID;
  if (!databaseId) {
    return NextResponse.json(
      { error: "NOTION_SOP_DATABASE_ID is not configured" },
      { status: 500 }
    );
  }

  try {
    const result = await runSync(databaseId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Notion SOP sync failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function runSync(databaseId: string): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, archived: 0, errors: [] };
  const seenPageIds = new Set<string>();

  const pages = (await fetchDatabasePages(databaseId)).filter(pageHasAllowedSopType);

  for (const page of pages) {
    seenPageIds.add(page.id);
    const normalized = normalizePage(page);
    const slug = `${slugifyTitle(normalized.title)}-${page.id.slice(0, 6).toLowerCase()}`;

    try {
      const existing = await prisma.sopDocument.findUnique({
        where: { notionPageId: normalized.notionPageId },
        select: { id: true },
      });

      const doc = await prisma.sopDocument.upsert({
        where: { notionPageId: normalized.notionPageId },
        create: {
          title: normalized.title,
          slug,
          summary: normalized.summary,
          sourceType: SOURCE_TYPE,
          notionDatabaseId: databaseId,
          notionPageId: normalized.notionPageId,
          notionUrl: normalized.notionUrl,
          status: page.archived ? "ARCHIVED" : "ACTIVE",
          lastSyncedAt: new Date(),
        },
        update: {
          title: normalized.title,
          summary: normalized.summary,
          notionUrl: normalized.notionUrl,
          status: page.archived ? "ARCHIVED" : "ACTIVE",
          lastSyncedAt: new Date(),
        },
      });

      const blocks = await fetchAndFlattenPageBlocks(page.id);

      await prisma.$transaction([
        prisma.sopContentBlock.deleteMany({ where: { documentId: doc.id } }),
        prisma.sopRoleAccess.deleteMany({ where: { documentId: doc.id } }),
        ...(blocks.length > 0
          ? [
              prisma.sopContentBlock.createMany({
                data: blocks.map((b) => ({
                  documentId: doc.id,
                  blockId: b.blockId,
                  parentBlockId: b.parentBlockId,
                  orderIndex: b.orderIndex,
                  depth: b.depth,
                  type: b.type,
                  payload: b.payload as never,
                })),
              }),
            ]
          : []),
        ...(normalized.allowedRoles.length > 0
          ? [
              prisma.sopRoleAccess.createMany({
                data: normalized.allowedRoles.map((role) => ({
                  documentId: doc.id,
                  role,
                })),
              }),
            ]
          : []),
      ]);

      if (existing) result.updated++;
      else result.created++;
    } catch (err) {
      result.errors.push(
        `Page ${page.id}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  // Any previously synced Notion SOPs no longer in the database query are archived.
  const existingDocs = await prisma.sopDocument.findMany({
    where: {
      sourceType: SOURCE_TYPE,
      status: { not: "ARCHIVED" },
    },
    select: { id: true, notionPageId: true },
  });

  for (const doc of existingDocs) {
    if (!seenPageIds.has(doc.notionPageId)) {
      await prisma.sopDocument.update({
        where: { id: doc.id },
        data: { status: "ARCHIVED" },
      });
      result.archived++;
    }
  }

  return result;
}
