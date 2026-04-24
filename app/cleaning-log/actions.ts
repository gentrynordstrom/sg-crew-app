"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { mondayQuery, mondayUploadFile } from "@/lib/monday";
import { CLEANING } from "@/lib/monday-schema";
import {
  buildColumnValues,
  statusValue,
  textValue,
  dateValue,
  formatMdy,
} from "@/lib/monday-values";

export async function createCleaningEntry(
  fd: FormData
): Promise<{ error: string } | undefined> {
  const user = await requireRole(["CAPTAIN", "DECKHAND", "ADMIN"]);

  const date = (fd.get("date") as string) ?? "";
  const cleaningType = (fd.get("cleaningType") as string) ?? "";
  const maintenanceNeeded = (fd.get("maintenanceNeeded") as string) ?? "No";
  const notes = (fd.get("notes") as string) ?? "";

  const columnValues = buildColumnValues({
    [CLEANING.columns.date.id]: date ? dateValue(date) : undefined,
    [CLEANING.columns.crewMember.id]: textValue(user.name),
    [CLEANING.columns.cleaningType.id]: cleaningType ? statusValue(cleaningType) : undefined,
    [CLEANING.columns.maintenanceNeeded.id]: statusValue(maintenanceNeeded),
    [CLEANING.columns.notes.id]: notes ? textValue(notes) : undefined,
  });

  const itemName = date
    ? `${formatMdy(date)} - ${user.name}`
    : `Cleaning - ${user.name}`;

  let newItemId: string;
  try {
    const result = await mondayQuery<{ create_item: { id: string } }>(
      `mutation ($boardId: ID!, $groupId: String!, $name: String!, $vals: JSON) {
         create_item(board_id: $boardId, group_id: $groupId, item_name: $name, column_values: $vals) { id }
       }`,
      {
        boardId: CLEANING.boardId,
        groupId: CLEANING.groupId,
        name: itemName,
        vals: JSON.stringify(columnValues),
      }
    );
    newItemId = result.create_item.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save entry. Please try again." };
  }

  // Upload after-pictures if provided (best-effort; don't fail the whole entry)
  const photos = fd.getAll("photos") as File[];
  for (const photo of photos) {
    if (photo.size > 0) {
      try {
        await mondayUploadFile(newItemId, CLEANING.columns.afterPictures.id, photo);
      } catch {
        // photo upload failure is non-fatal
      }
    }
  }

  revalidatePath("/cleaning-log");
  redirect("/cleaning-log");
}
