"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { mondayQuery } from "@/lib/monday";
import { CRUISE } from "@/lib/monday-schema";
import {
  buildColumnValues,
  statusValue,
  textValue,
  numberValue,
  longTextValue,
  formatMdy,
} from "@/lib/monday-values";

export async function createCruiseEntry(
  fd: FormData
): Promise<{ error: string } | { itemId: string }> {
  await requireRole(["CAPTAIN", "ADMIN"]);

  const date = (fd.get("date") as string) ?? "";
  const outcome = (fd.get("outcome") as string) ?? "";
  const cruiseType = (fd.get("cruiseType") as string) ?? "";
  const captain = (fd.get("captain") as string) ?? "";
  const departureTime = (fd.get("departureTime") as string) ?? "";
  const returnTime = (fd.get("returnTime") as string) ?? "";
  const weather = (fd.get("weather") as string) ?? "";
  const wind = (fd.get("wind") as string) ?? "";
  const guestsRaw = fd.get("guests") as string;
  const crewCountRaw = fd.get("crewCount") as string;
  const notes = (fd.get("notes") as string) ?? "";

  const columnValues = buildColumnValues({
    [CRUISE.columns.outcome.id]: outcome ? statusValue(outcome) : undefined,
    [CRUISE.columns.cruiseType.id]: cruiseType ? statusValue(cruiseType) : undefined,
    [CRUISE.columns.captain.id]: captain ? statusValue(captain) : undefined,
    [CRUISE.columns.departureTime.id]: departureTime ? textValue(departureTime) : undefined,
    [CRUISE.columns.returnTime.id]: returnTime ? textValue(returnTime) : undefined,
    [CRUISE.columns.weather.id]: weather ? textValue(weather) : undefined,
    [CRUISE.columns.wind.id]: wind ? textValue(wind) : undefined,
    [CRUISE.columns.guests.id]: guestsRaw ? numberValue(guestsRaw) : undefined,
    [CRUISE.columns.crewCount.id]: crewCountRaw ? numberValue(crewCountRaw) : undefined,
    [CRUISE.columns.notes.id]: notes ? longTextValue(notes) : undefined,
  });

  const itemName = date ? formatMdy(date) : "New Cruise";

  try {
    const result = await mondayQuery<{ create_item: { id: string } }>(
      `mutation ($boardId: ID!, $groupId: String!, $name: String!, $vals: JSON) {
         create_item(board_id: $boardId, group_id: $groupId, item_name: $name, column_values: $vals) { id }
       }`,
      {
        boardId: CRUISE.boardId,
        groupId: CRUISE.groupId,
        name: itemName,
        vals: JSON.stringify(columnValues),
      }
    );
    revalidatePath("/cruise-log");
    return { itemId: result.create_item.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save entry. Please try again." };
  }
}
