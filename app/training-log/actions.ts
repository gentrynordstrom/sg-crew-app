"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  dropdownLabelsFromSnapshot,
  fetchMondayBoardSnapshot,
  resolveGroupIdFromSnapshot,
} from "@/lib/monday-board";
import { mondayQuery } from "@/lib/monday";
import { TRAINING } from "@/lib/monday-schema";
import {
  buildColumnValues,
  dropdownValue,
  formatMdy,
  textValue,
} from "@/lib/monday-values";

export async function createTrainingEntry(
  fd: FormData
): Promise<{ error: string } | { itemId: string }> {
  const user = await requireRole(["CAPTAIN", "ADMIN"]);

  const date = ((fd.get("date") as string) ?? "").trim();
  const title = ((fd.get("title") as string) ?? "").trim();
  const trainingType = ((fd.get("trainingType") as string) ?? "").trim();
  if (!title) return { error: "Training title is required." };
  if (!trainingType) return { error: "Training type is required." };

  let snapshot;
  try {
    snapshot = await fetchMondayBoardSnapshot(TRAINING.boardId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to load Monday board." };
  }

  const trainingTypeLabels = dropdownLabelsFromSnapshot(
    snapshot.columns,
    TRAINING.columns.trainingType.id
  );
  if (trainingTypeLabels.length === 0) {
    return {
      error:
        "Training type options are not configured on the Monday board (empty dropdown).",
    };
  }
  if (!trainingTypeLabels.includes(trainingType)) {
    return { error: "Invalid training type." };
  }

  let groupId: string;
  try {
    groupId = resolveGroupIdFromSnapshot(
      snapshot.groups,
      process.env.MONDAY_TRAINING_GROUP_ID
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not resolve Monday group." };
  }

  const columnValues = buildColumnValues({
    [TRAINING.columns.submittedBy.id]: textValue(user.name),
    [TRAINING.columns.trainingType.id]: dropdownValue([trainingType]),
  });

  const itemName = date ? `${formatMdy(date)} - ${title}` : title;

  try {
    const result = await mondayQuery<{ create_item: { id: string } }>(
      `mutation ($boardId: ID!, $groupId: String!, $name: String!, $vals: JSON) {
         create_item(board_id: $boardId, group_id: $groupId, item_name: $name, column_values: $vals) { id }
       }`,
      {
        boardId: TRAINING.boardId,
        groupId,
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
