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

export async function createCleaningEntry(fd: FormData) {
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

  const newItemId = result.create_item.id;

  // Upload after-pictures if provided
  const photos = fd.getAll("photos") as File[];
  for (const photo of photos) {
    if (photo.size > 0) {
      await mondayUploadFile(newItemId, CLEANING.columns.afterPictures.id, photo);
    }
  }

  revalidatePath("/cleaning-log");
  redirect("/cleaning-log");
}
