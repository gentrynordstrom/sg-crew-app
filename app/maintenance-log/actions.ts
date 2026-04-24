"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { mondayQuery, mondayUploadFile } from "@/lib/monday";
import { MAINTENANCE } from "@/lib/monday-schema";
import {
  buildColumnValues,
  statusValue,
  textValue,
  dateValue,
  formatMdy,
} from "@/lib/monday-values";

export async function createMaintenanceEntry(fd: FormData) {
  const user = await requireRole(["CAPTAIN", "DECKHAND", "MECHANIC", "ADMIN"]);

  const date = (fd.get("date") as string) ?? "";
  const maintenanceType = (fd.get("maintenanceType") as string) ?? "";
  const resolved = (fd.get("resolved") as string) ?? "Not Yet";
  const notes = (fd.get("notes") as string) ?? "";

  const columnValues = buildColumnValues({
    [MAINTENANCE.columns.date.id]: date ? dateValue(date) : undefined,
    [MAINTENANCE.columns.crewMember.id]: textValue(user.name),
    [MAINTENANCE.columns.maintenanceType.id]: maintenanceType ? statusValue(maintenanceType) : undefined,
    [MAINTENANCE.columns.resolved.id]: statusValue(resolved),
    [MAINTENANCE.columns.notes.id]: notes ? textValue(notes) : undefined,
  });

  const itemName = date
    ? `${formatMdy(date)} - ${maintenanceType || "Maintenance"}`
    : maintenanceType || "Maintenance";

  const result = await mondayQuery<{ create_item: { id: string } }>(
    `mutation ($boardId: ID!, $groupId: String!, $name: String!, $vals: JSON) {
       create_item(board_id: $boardId, group_id: $groupId, item_name: $name, column_values: $vals) { id }
     }`,
    {
      boardId: MAINTENANCE.boardId,
      groupId: MAINTENANCE.groupId,
      name: itemName,
      vals: JSON.stringify(columnValues),
    }
  );

  const newItemId = result.create_item.id;

  const beforePhotos = fd.getAll("beforePhotos") as File[];
  for (const photo of beforePhotos) {
    if (photo.size > 0) {
      await mondayUploadFile(newItemId, MAINTENANCE.columns.beforePictures.id, photo);
    }
  }

  const afterPhotos = fd.getAll("afterPhotos") as File[];
  for (const photo of afterPhotos) {
    if (photo.size > 0) {
      await mondayUploadFile(newItemId, MAINTENANCE.columns.afterPictures.id, photo);
    }
  }

  revalidatePath("/maintenance-log");
  redirect("/maintenance-log");
}
