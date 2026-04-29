"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { mondayQuery } from "@/lib/monday";
import { TRAINING } from "@/lib/monday-schema";
import { buildColumnValues, textValue, formatMdy } from "@/lib/monday-values";

export async function createTrainingEntry(
  fd: FormData
): Promise<{ error: string } | { itemId: string }> {
  const user = await requireRole(["CAPTAIN", "ADMIN"]);

  const date = ((fd.get("date") as string) ?? "").trim();
  const title = ((fd.get("title") as string) ?? "").trim();
  if (!title) return { error: "Training title is required." };

  const columnValues = buildColumnValues({
    [TRAINING.columns.submittedBy.id]: textValue(user.name),
  });

  const itemName = date ? `${formatMdy(date)} - ${title}` : title;

  try {
    const result = await mondayQuery<{ create_item: { id: string } }>(
      `mutation ($boardId: ID!, $groupId: String!, $name: String!, $vals: JSON) {
         create_item(board_id: $boardId, group_id: $groupId, item_name: $name, column_values: $vals) { id }
       }`,
      {
        boardId: TRAINING.boardId,
        groupId: TRAINING.groupId,
        name: itemName,
        vals: JSON.stringify(columnValues),
      }
    );
    revalidatePath("/training-log");
    return { itemId: result.create_item.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save training entry." };
  }
}
